import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionStatus, RefundStatus, OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      paidOrders,
      pendingOrders,
      cancelledOrders,
      totalRevenue,
      totalRefunded,
      failedPayments,
      recentTransactions,
      totalCustomers,
      totalFilms,
      timelineTransactions,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PAID } }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: TransactionStatus.SUCCEEDED },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.refund.aggregate({
        where: { status: RefundStatus.SUCCEEDED },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.paymentTransaction.count({
        where: { status: TransactionStatus.FAILED },
      }),
      this.prisma.paymentTransaction.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          payment_method: { select: { name: true } },
          order: {
            include: {
              customer: { select: { first_name: true, last_name: true } },
            },
          },
        },
      }),
      this.prisma.customer.count(),
      this.prisma.film.count(),
      this.prisma.paymentTransaction.findMany({
        where: {
          status: TransactionStatus.SUCCEEDED,
          created_at: { gte: since },
        },
        select: { amount: true, created_at: true },
      }),
    ]);

    const gross = totalRevenue._sum.amount || new Prisma.Decimal(0);
    const refunded = totalRefunded._sum.amount || new Prisma.Decimal(0);

    return {
      orders: {
        total: totalOrders,
        paid: paidOrders,
        pending: pendingOrders,
        cancelled: cancelledOrders,
      },
      revenue: {
        total: gross,
        net: gross.sub(refunded),
        transactions_count: totalRevenue._count,
      },
      refunds: {
        total: refunded,
        count: totalRefunded._count,
      },
      catalog: {
        customers: totalCustomers,
        films: totalFilms,
      },
      failed_payments: failedPayments,
      sales_timeline: this.buildDailyTimeline(timelineTransactions, 14),
      recent_transactions: recentTransactions,
    };
  }

  async getSalesReport(startDate?: string, endDate?: string) {
    const where: Prisma.PaymentTransactionWhereInput = {
      status: TransactionStatus.SUCCEEDED,
    };

    if (startDate || endDate) {
      where.created_at = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
      };
    }

    const [transactions, aggregates] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: {
          payment_method: { select: { name: true, code: true } },
          order: {
            include: {
              customer: {
                select: { first_name: true, last_name: true, email: true },
              },
              order_items: {
                include: { film: { select: { title: true } } },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.paymentTransaction.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true,
      }),
    ]);

    const byMethod = new Map<string, { count: number; total: Prisma.Decimal }>();
    for (const txn of transactions) {
      const key = txn.payment_method.code;
      const current = byMethod.get(key) || {
        count: 0,
        total: new Prisma.Decimal(0),
      };
      byMethod.set(key, {
        count: current.count + 1,
        total: current.total.add(txn.amount),
      });
    }

    return {
      summary: {
        total_amount: aggregates._sum.amount || 0,
        average_amount: aggregates._avg.amount || 0,
        transaction_count: aggregates._count,
        by_method: Array.from(byMethod.entries()).map(([code, value]) => ({
          code,
          count: value.count,
          total_amount: value.total,
        })),
        timeline: this.buildDailyTimeline(transactions, 30),
      },
      transactions,
    };
  }

  async getPaymentsReport() {
    const byStatus = await this.prisma.paymentTransaction.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { amount: true },
    });

    const byMethod = await this.prisma.paymentTransaction.groupBy({
      by: ['payment_method_id'],
      _count: { payment_method_id: true },
      _sum: { amount: true },
    });

    const methodNames = await this.prisma.paymentMethod.findMany({
      select: { id: true, name: true, code: true },
    });

    const methodMap = new Map(methodNames.map((m) => [m.id, m]));

    return {
      by_status: byStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
        total_amount: s._sum.amount || 0,
      })),
      by_method: byMethod.map((m) => ({
        method: methodMap.get(m.payment_method_id),
        count: m._count.payment_method_id,
        total_amount: m._sum.amount || 0,
      })),
      methods: methodNames,
    };
  }

  async getRefundsReport() {
    const [refunds, aggregates] = await Promise.all([
      this.prisma.refund.findMany({
        include: {
          transaction: {
            include: {
              order: {
                include: {
                  customer: { select: { first_name: true, last_name: true } },
                },
              },
              payment_method: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.refund.aggregate({
        where: { status: RefundStatus.SUCCEEDED },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const byStatus = new Map<string, number>();
    for (const refund of refunds) {
      byStatus.set(refund.status, (byStatus.get(refund.status) || 0) + 1);
    }

    return {
      summary: {
        total_refunded: aggregates._sum.amount || 0,
        count: aggregates._count,
        by_status: Array.from(byStatus.entries()).map(([status, count]) => ({
          status,
          count,
        })),
      },
      refunds,
    };
  }

  private buildDailyTimeline(
    transactions: Array<{ amount: Prisma.Decimal; created_at: Date }>,
    days: number,
  ) {
    const buckets = new Map<string, { total: Prisma.Decimal; count: number }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      buckets.set(this.dateKey(date), {
        total: new Prisma.Decimal(0),
        count: 0,
      });
    }

    for (const txn of transactions) {
      const key = this.dateKey(txn.created_at);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total = bucket.total.add(txn.amount);
      bucket.count += 1;
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      total: value.total,
      count: value.count,
    }));
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
