import { PrismaClient, UserRole, OrderStatus, TransactionStatus, RefundStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Tipo de cambio demo usado para convertir los precios base de Sakila (USD) a BOB.
const BOB_RATE = 6.96;
const toBob = (usd: number): number => Math.round(usd * BOB_RATE * 100) / 100;

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Languages ────────────────────────────────────────────
  const [english, italian] = await Promise.all([
    prisma.language.upsert({
      where: { language_id: 1 },
      update: {},
      create: { language_id: 1, name: 'English' },
    }),
    prisma.language.upsert({
      where: { language_id: 2 },
      update: {},
      create: { language_id: 2, name: 'Italian' },
    }),
  ]);
  console.log('✅ Languages seeded');

  // ─── Categories ────────────────────────────────────────────
  const categoryNames = [
    'Action', 'Animation', 'Children', 'Classics', 'Comedy',
    'Documentary', 'Drama', 'Family', 'Foreign', 'Games',
    'Horror', 'Music', 'New', 'Sci-Fi', 'Sports', 'Travel',
  ];
  const categories = [];
  for (let i = 0; i < categoryNames.length; i++) {
    const cat = await prisma.category.upsert({
      where: { category_id: i + 1 },
      update: {},
      create: { category_id: i + 1, name: categoryNames[i] },
    });
    categories.push(cat);
  }
  console.log('✅ Categories seeded');

  // ─── Actors ────────────────────────────────────────────────
  const actorData = [
    { first_name: 'PENELOPE', last_name: 'GUINESS' },
    { first_name: 'NICK', last_name: 'WAHLBERG' },
    { first_name: 'ED', last_name: 'CHASE' },
    { first_name: 'JENNIFER', last_name: 'DAVIS' },
    { first_name: 'JOHNNY', last_name: 'LOLLOBRIGIDA' },
    { first_name: 'BETTE', last_name: 'NICHOLSON' },
    { first_name: 'GRACE', last_name: 'MOSTEL' },
    { first_name: 'MATTHEW', last_name: 'JOHANSSON' },
    { first_name: 'JOE', last_name: 'SWANK' },
    { first_name: 'CHRISTIAN', last_name: 'GABLE' },
  ];
  const actors = [];
  for (let i = 0; i < actorData.length; i++) {
    const actor = await prisma.actor.upsert({
      where: { actor_id: i + 1 },
      update: {},
      create: { actor_id: i + 1, ...actorData[i] },
    });
    actors.push(actor);
  }
  console.log('✅ Actors seeded');

  // ─── Films ────────────────────────────────────────────────
  const filmData = [
    {
      title: 'ACADEMY DINOSAUR',
      description: 'A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 0.99, length: 86, replacement_cost: 20.99, rating: 'PG',
      special_features: ['Deleted Scenes', 'Behind the Scenes'],
    },
    {
      title: 'ACE GOLDFINGER',
      description: 'A Astounding Epistle of a Database Administrator And a Explorer who must Find a Car in Ancient China',
      release_year: 2006, language_id: 1, rental_duration: 3,
      rental_rate: 4.99, length: 48, replacement_cost: 12.99, rating: 'G',
      special_features: ['Trailers', 'Deleted Scenes'],
    },
    {
      title: 'ADAPTATION HOLES',
      description: 'A Astounding Reflection of a Lumberjack And a Car who must Sink a Lumberjack in A Baloon Factory',
      release_year: 2006, language_id: 1, rental_duration: 7,
      rental_rate: 2.99, length: 50, replacement_cost: 18.99, rating: 'NC_17',
      special_features: ['Trailers', 'Deleted Scenes'],
    },
    {
      title: 'AFFAIR PREJUDICE',
      description: 'A Fanciful Documentary of a Frisbee And a Lumberjack who must Chase a Monkey in A Shark Tank',
      release_year: 2006, language_id: 1, rental_duration: 5,
      rental_rate: 2.99, length: 117, replacement_cost: 26.99, rating: 'G',
      special_features: ['Commentaries', 'Behind the Scenes'],
    },
    {
      title: 'AFRICAN EGG',
      description: 'A Fast-Paced Documentary of a Pastry Chef And a Dentist who must Pursue a Forensic Psychologist in The Gulf of Mexico',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 2.99, length: 130, replacement_cost: 22.99, rating: 'G',
      special_features: ['Deleted Scenes'],
    },
    {
      title: 'AGENT TRUMAN',
      description: 'A Intrepid Panorama of a Robot And a Boy who must Escape a Sumo Wrestler in Ancient China',
      release_year: 2006, language_id: 1, rental_duration: 3,
      rental_rate: 2.99, length: 169, replacement_cost: 17.99, rating: 'PG',
      special_features: ['Deleted Scenes'],
    },
    {
      title: 'AIRPLANE SIERRA',
      description: 'A Touching Saga of a Hunter And a Butler who must Discover a Butler in A Jet Boat',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 4.99, length: 62, replacement_cost: 28.99, rating: 'PG_13',
      special_features: ['Trailers', 'Deleted Scenes'],
    },
    {
      title: 'AIRPORT POLLOCK',
      description: 'A Epic Tale of a Moose And a Girl who must Confront a Monkey in Ancient India',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 4.99, length: 54, replacement_cost: 15.99, rating: 'R',
      special_features: ['Trailers'],
    },
    {
      title: 'ALABAMA DEVIL',
      description: 'A Thoughtful Panorama of a Database Administrator And a Mad Scientist who must Outgun a Mad Scientist in A Jet Boat',
      release_year: 2006, language_id: 1, rental_duration: 3,
      rental_rate: 2.99, length: 114, replacement_cost: 21.99, rating: 'PG_13',
      special_features: ['Trailers', 'Deleted Scenes'],
    },
    {
      title: 'ALADDIN CALENDAR',
      description: 'A Action-Packed Tale of a Man And a Lumberjack who must Reach a Feminist in Ancient China',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 4.99, length: 63, replacement_cost: 29.99, rating: 'NC_17',
      special_features: ['Trailers', 'Deleted Scenes'],
    },
    {
      title: 'ALAMO VIDEOTAPE',
      description: 'A Boring Epistle of a Butler And a Cat who must Fight a Pastry Chef in A MySQL Convention',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 0.99, length: 126, replacement_cost: 16.99, rating: 'G',
      special_features: ['Commentaries', 'Behind the Scenes'],
    },
    {
      title: 'ALASKA PHANTOM',
      description: 'A Fanciful Saga of a Hunter And a Pastry Chef who must Vanquish a Boy in Australia',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 0.99, length: 136, replacement_cost: 22.99, rating: 'PG',
      special_features: ['Commentaries', 'Deleted Scenes'],
    },
    {
      title: 'ALI FOREVER',
      description: 'A Action-Packed Drama of a Dentist And a Crocodile who must Battle a Feminist in The Canadian Rockies',
      release_year: 2006, language_id: 1, rental_duration: 4,
      rental_rate: 4.99, length: 150, replacement_cost: 21.99, rating: 'PG',
      special_features: ['Deleted Scenes', 'Behind the Scenes'],
    },
    {
      title: 'ALICE FANTASIA',
      description: 'A Emotional Drama of a A Shark And a Database Administrator who must Vanquish a Pioneer in Soviet Georgia',
      release_year: 2006, language_id: 1, rental_duration: 6,
      rental_rate: 0.99, length: 94, replacement_cost: 23.99, rating: 'NC_17',
      special_features: ['Trailers', 'Deleted Scenes', 'Behind the Scenes'],
    },
    {
      title: 'ALIEN CENTER',
      description: 'A Brilliant Drama of a Cat And a Mad Scientist who must Battle a Feminist in A MySQL Convention',
      release_year: 2006, language_id: 1, rental_duration: 5,
      rental_rate: 2.99, length: 46, replacement_cost: 10.99, rating: 'NC_17',
      special_features: ['Trailers', 'Commentaries', 'Behind the Scenes'],
    },
  ];

  const films = [];
  for (let i = 0; i < filmData.length; i++) {
    const { rating, ...rest } = filmData[i];
    const rentalRate = toBob(filmData[i].rental_rate);
    const replacementCost = toBob(filmData[i].replacement_cost);
    const film = await prisma.film.upsert({
      where: { film_id: i + 1 },
      update: {},
      create: {
        film_id: i + 1,
        ...rest,
        rating: rating as any,
        rental_rate: rentalRate,
        replacement_cost: replacementCost,
      },
    });
    films.push(film);
  }
  console.log('✅ Films seeded');

  // ─── Film-Category associations ───────────────────────────
  const filmCategoryPairs = [
    [1, 6], [2, 11], [3, 6], [4, 11], [5, 8],
    [6, 9], [7, 5], [8, 2], [9, 11], [10, 15],
    [11, 9], [12, 9], [13, 7], [14, 9], [15, 4],
  ];
  for (const [filmId, categoryId] of filmCategoryPairs) {
    await prisma.filmCategory.upsert({
      where: { film_id_category_id: { film_id: filmId, category_id: categoryId } },
      update: {},
      create: { film_id: filmId, category_id: categoryId },
    });
  }
  console.log('✅ Film categories seeded');

  // ─── Film-Actor associations ──────────────────────────────
  const filmActorPairs = [
    [1, 1], [1, 10], [2, 1], [3, 1], [4, 4],
    [5, 5], [6, 3], [7, 6], [8, 9], [9, 10],
    [10, 2], [11, 3], [12, 4], [13, 5], [14, 6], [15, 7],
  ];
  for (const [filmId, actorId] of filmActorPairs) {
    await prisma.filmActor.upsert({
      where: { actor_id_film_id: { actor_id: actorId, film_id: filmId } },
      update: {},
      create: { actor_id: actorId, film_id: filmId },
    });
  }
  console.log('✅ Film actors seeded');

  // ─── Countries & Cities ───────────────────────────────────
  const country = await prisma.country.upsert({
    where: { country_id: 1 },
    update: {},
    create: { country_id: 1, country: 'United States' },
  });
  const country2 = await prisma.country.upsert({
    where: { country_id: 2 },
    update: {},
    create: { country_id: 2, country: 'Mexico' },
  });

  const city1 = await prisma.city.upsert({
    where: { city_id: 1 },
    update: {},
    create: { city_id: 1, city: 'Lethbridge', country_id: 1 },
  });
  const city2 = await prisma.city.upsert({
    where: { city_id: 2 },
    update: {},
    create: { city_id: 2, city: 'Woodridge', country_id: 1 },
  });
  const city3 = await prisma.city.upsert({
    where: { city_id: 3 },
    update: {},
    create: { city_id: 3, city: 'Monterrey', country_id: 2 },
  });

  // ─── Addresses ────────────────────────────────────────────
  const address1 = await prisma.address.upsert({
    where: { address_id: 1 },
    update: {},
    create: {
      address_id: 1, address: '47 MySakila Drive', district: 'Alberta',
      city_id: 1, postal_code: '', phone: '',
    },
  });
  const address2 = await prisma.address.upsert({
    where: { address_id: 2 },
    update: {},
    create: {
      address_id: 2, address: '28 MySQL Boulevard', district: 'QLD',
      city_id: 2, postal_code: '', phone: '',
    },
  });
  const address3 = await prisma.address.upsert({
    where: { address_id: 3 },
    update: {},
    create: {
      address_id: 3, address: '23 Workhaven Lane', district: 'Alberta',
      city_id: 1, phone: '14033335568', postal_code: '',
    },
  });
  const address4 = await prisma.address.upsert({
    where: { address_id: 4 },
    update: {},
    create: {
      address_id: 4, address: '1411 Lillydale Drive', district: 'QLD',
      city_id: 2, phone: '6172235589', postal_code: '',
    },
  });
  const addressCustomer1 = await prisma.address.upsert({
    where: { address_id: 5 },
    update: {},
    create: {
      address_id: 5, address: '1913 Hanoi Way', district: 'Nagasaki',
      city_id: 3, phone: '28303384290', postal_code: '35200',
    },
  });
  const addressCustomer2 = await prisma.address.upsert({
    where: { address_id: 6 },
    update: {},
    create: {
      address_id: 6, address: '1121 Loja Avenue', district: 'California',
      city_id: 1, phone: '838635286649', postal_code: '17886',
    },
  });
  console.log('✅ Countries, Cities, Addresses seeded');

  // ─── Stores ───────────────────────────────────────────────
  // Stores are created first with no manager because staff references the
  // store and the store references its manager (circular FK). The manager is
  // assigned right after the staff records exist.
  const store1 = await prisma.store.upsert({
    where: { store_id: 1 },
    update: {},
    create: { store_id: 1, manager_staff_id: null, address_id: 1 },
  });
  const store2 = await prisma.store.upsert({
    where: { store_id: 2 },
    update: {},
    create: { store_id: 2, manager_staff_id: null, address_id: 2 },
  });

  // ─── Staff ────────────────────────────────────────────────
  const staff1 = await prisma.staff.upsert({
    where: { staff_id: 1 },
    update: {},
    create: {
      staff_id: 1, first_name: 'Mike', last_name: 'Hillyer',
      address_id: 3, email: 'Mike.Hillyer@sakilastaff.com',
      store_id: 1, active: true, username: 'Mike',
      password: '$2a$10$eVWNfGGSz3.AidxNNnQhTuE/FOwjhN4Z.bJt1A0bBhBIWQ4K.3dXe',
    },
  });
  const staff2 = await prisma.staff.upsert({
    where: { staff_id: 2 },
    update: {},
    create: {
      staff_id: 2, first_name: 'Jon', last_name: 'Stephens',
      address_id: 4, email: 'Jon.Stephens@sakilastaff.com',
      store_id: 2, active: true, username: 'Jon',
      password: '$2a$10$eVWNfGGSz3.AidxNNnQhTuE/FOwjhN4Z.bJt1A0bBhBIWQ4K.3dXe',
    },
  });

  await prisma.store.update({
    where: { store_id: store1.store_id },
    data: { manager_staff_id: staff1.staff_id },
  });
  await prisma.store.update({
    where: { store_id: store2.store_id },
    data: { manager_staff_id: staff2.staff_id },
  });
  console.log('✅ Stores and Staff seeded');

  // ─── Customers ────────────────────────────────────────────
  const customersData = [
    { customer_id: 1, store_id: 1, first_name: 'MARY', last_name: 'SMITH', email: 'MARY.SMITH@sakilacustomer.org', address_id: 5 },
    { customer_id: 2, store_id: 1, first_name: 'PATRICIA', last_name: 'JOHNSON', email: 'PATRICIA.JOHNSON@sakilacustomer.org', address_id: 6 },
    { customer_id: 3, store_id: 1, first_name: 'LINDA', last_name: 'WILLIAMS', email: 'LINDA.WILLIAMS@sakilacustomer.org', address_id: 5 },
    { customer_id: 4, store_id: 2, first_name: 'BARBARA', last_name: 'JONES', email: 'BARBARA.JONES@sakilacustomer.org', address_id: 6 },
    { customer_id: 5, store_id: 2, first_name: 'ELIZABETH', last_name: 'BROWN', email: 'ELIZABETH.BROWN@sakilacustomer.org', address_id: 5 },
  ];
  const customers = [];
  for (const c of customersData) {
    const customer = await prisma.customer.upsert({
      where: { customer_id: c.customer_id },
      update: {},
      create: c,
    });
    customers.push(customer);
  }
  console.log('✅ Customers seeded');

  // ─── Inventories ──────────────────────────────────────────
  for (let i = 0; i < films.length; i++) {
    await prisma.inventory.upsert({
      where: { inventory_id: i + 1 },
      update: {},
      create: {
        inventory_id: i + 1,
        film_id: films[i].film_id,
        store_id: (i % 2) + 1,
      },
    });
  }
  console.log('✅ Inventories seeded');

  // ─── Payment Methods (Bolivia) ─────────────────────────────
  const paymentMethods = [
    {
      id: 'pm-qr-001',
      code: 'QR_SIMPLE',
      name: 'QR Simple (ASFI)',
      provider: 'ASFI / QR Simple',
      description:
        'Pago con QR Simple del sistema financiero boliviano (ASFI). Simulado para demostración, no procesa dinero real.',
    },
    {
      id: 'pm-card-001',
      code: 'CARD_BO',
      name: 'Tarjeta Visa/Mastercard (VisaNet Bolivia)',
      provider: 'VisaNet Bolivia',
      description:
        'Tarjeta de crédito o débito boliviana procesada por VisaNet Bolivia. Simulada, no procesa dinero real.',
    },
    {
      id: 'pm-transfer-001',
      code: 'BANK_TRANSFER',
      name: 'Transferencia bancaria BCP/BNB',
      provider: 'BCP / BNB',
      description:
        'Transferencia a cuenta bancaria boliviana (BCP o BNB). Simulada para fines educativos.',
    },
    {
      id: 'pm-wallet-001',
      code: 'TIGO_MONEY',
      name: 'Tigo Money',
      provider: 'Tigo Money',
      description:
        'Billetera móvil Tigo Money. Requiere celular boliviano de 8 dígitos. Simulada, no procesa dinero real.',
    },
    {
      id: 'pm-entel-001',
      code: 'ENTEL_MONEY',
      name: 'Entel Money',
      provider: 'Entel Money',
      description:
        'Billetera móvil Entel Money. Requiere celular boliviano de 8 dígitos. Simulada, no procesa dinero real.',
    },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { id: pm.id },
      update: {
        code: pm.code,
        name: pm.name,
        provider: pm.provider,
        description: pm.description,
        is_active: true,
      },
      create: pm,
    });
  }
  console.log('✅ Bolivian payment methods seeded');

  // ─── Admin Users ──────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash('Admin@12345!', 12);
  const staffPasswordHash = await bcrypt.hash('Staff@12345!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sakila-gateway.demo' },
    update: {},
    create: {
      id: 'user-admin-001',
      email: 'admin@sakila-gateway.demo',
      password_hash: adminPasswordHash,
      name: 'Administrador Principal',
      role: UserRole.ADMIN,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@sakila-gateway.demo' },
    update: {},
    create: {
      id: 'user-staff-001',
      email: 'staff@sakila-gateway.demo',
      password_hash: staffPasswordHash,
      name: 'Operador Sakila',
      role: UserRole.STAFF,
    },
  });

  const viewerUser = await prisma.user.upsert({
    where: { email: 'viewer@sakila-gateway.demo' },
    update: {},
    create: {
      id: 'user-viewer-001',
      email: 'viewer@sakila-gateway.demo',
      password_hash: await bcrypt.hash('Viewer@12345!', 12),
      name: 'Visor de Reportes',
      role: UserRole.VIEWER,
    },
  });
  console.log('✅ Admin users seeded');

  // ─── Demo Orders ──────────────────────────────────────────
  // Order 1: Paid
  const order1 = await prisma.order.upsert({
    where: { order_number: 'ORD-2024-000001' },
    update: {},
    create: {
      id: 'order-001',
      order_number: 'ORD-2024-000001',
      customer_id: 1,
      status: OrderStatus.PAID,
      currency: 'BOB',
      subtotal: toBob(5.98),
      tax: 0,
      total: toBob(5.98),
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'oi-001-001' },
    update: {},
    create: {
      id: 'oi-001-001', order_id: 'order-001',
      film_id: 1, quantity: 2, unit_price: toBob(0.99), subtotal: toBob(1.98),
    },
  });
  await prisma.orderItem.upsert({
    where: { id: 'oi-001-002' },
    update: {},
    create: {
      id: 'oi-001-002', order_id: 'order-001',
      film_id: 2, quantity: 1, unit_price: toBob(4.0), subtotal: toBob(4.0),
    },
  });

  // Payment transaction 1: SUCCEEDED
  await prisma.paymentTransaction.upsert({
    where: { transaction_ref: 'TXN-DEMO-001' },
    update: {},
    create: {
      id: 'txn-001',
      order_id: 'order-001',
      transaction_ref: 'TXN-DEMO-001',
      idempotency_key: 'idem-order-001-attempt-1',
      amount: toBob(5.98),
      currency: 'BOB',
      payment_method_id: 'pm-qr-001',
      status: TransactionStatus.SUCCEEDED,
      response_code: 'APPROVED',
      response_message: 'Pago aprobado vía QR Simple (ASFI)',
      provider_reference: 'QR-ASFI-DEMO0001',
    },
  });

  // Order 2: Pending
  await prisma.order.upsert({
    where: { order_number: 'ORD-2024-000002' },
    update: {},
    create: {
      id: 'order-002',
      order_number: 'ORD-2024-000002',
      customer_id: 2,
      status: OrderStatus.PENDING,
      currency: 'BOB',
      subtotal: toBob(2.99),
      tax: 0,
      total: toBob(2.99),
    },
  });
  await prisma.orderItem.upsert({
    where: { id: 'oi-002-001' },
    update: {},
    create: {
      id: 'oi-002-001', order_id: 'order-002',
      film_id: 3, quantity: 1, unit_price: toBob(2.99), subtotal: toBob(2.99),
    },
  });

  // Order 3: Failed payment
  await prisma.order.upsert({
    where: { order_number: 'ORD-2024-000003' },
    update: {},
    create: {
      id: 'order-003',
      order_number: 'ORD-2024-000003',
      customer_id: 3,
      status: OrderStatus.PENDING,
      currency: 'BOB',
      subtotal: toBob(4.99),
      tax: 0,
      total: toBob(4.99),
    },
  });
  await prisma.orderItem.upsert({
    where: { id: 'oi-003-001' },
    update: {},
    create: {
      id: 'oi-003-001', order_id: 'order-003',
      film_id: 7, quantity: 1, unit_price: toBob(4.99), subtotal: toBob(4.99),
    },
  });

  // Payment transaction 3: FAILED
  await prisma.paymentTransaction.upsert({
    where: { transaction_ref: 'TXN-DEMO-003' },
    update: {},
    create: {
      id: 'txn-003',
      order_id: 'order-003',
      transaction_ref: 'TXN-DEMO-003',
      idempotency_key: 'idem-order-003-attempt-1',
      amount: toBob(4.99),
      currency: 'BOB',
      payment_method_id: 'pm-card-001',
      status: TransactionStatus.FAILED,
      response_code: 'INSUFFICIENT_FUNDS',
      response_message: 'Fondos insuficientes o límite de tarjeta excedido',
      provider_reference: 'VN-BO-DEMO0003',
    },
  });

  // Order 4: Refunded
  await prisma.order.upsert({
    where: { order_number: 'ORD-2024-000004' },
    update: {},
    create: {
      id: 'order-004',
      order_number: 'ORD-2024-000004',
      customer_id: 4,
      status: OrderStatus.REFUNDED,
      currency: 'BOB',
      subtotal: toBob(2.99),
      tax: 0,
      total: toBob(2.99),
    },
  });
  await prisma.orderItem.upsert({
    where: { id: 'oi-004-001' },
    update: {},
    create: {
      id: 'oi-004-001', order_id: 'order-004',
      film_id: 6, quantity: 1, unit_price: toBob(2.99), subtotal: toBob(2.99),
    },
  });

  // Payment transaction 4: SUCCEEDED then refunded
  await prisma.paymentTransaction.upsert({
    where: { transaction_ref: 'TXN-DEMO-004' },
    update: {},
    create: {
      id: 'txn-004',
      order_id: 'order-004',
      transaction_ref: 'TXN-DEMO-004',
      idempotency_key: 'idem-order-004-attempt-1',
      amount: toBob(2.99),
      currency: 'BOB',
      payment_method_id: 'pm-wallet-001',
      status: TransactionStatus.SUCCEEDED,
      response_code: 'APPROVED',
      response_message: 'Pago aprobado con Tigo Money',
      provider_reference: 'TIGO-DEMO0004',
      payer_identifier: '+591 ****4567',
    },
  });

  // Refund for order 4
  await prisma.refund.upsert({
    where: { reference: 'REF-DEMO-001' },
    update: {},
    create: {
      id: 'refund-001',
      transaction_id: 'txn-004',
      amount: toBob(2.99),
      reason: 'Cliente solicita cancelación - demo',
      status: RefundStatus.SUCCEEDED,
      reference: 'REF-DEMO-001',
      response_code: 'REFUND_APPROVED',
      response_message: 'Reembolso procesado correctamente por el proveedor boliviano',
    },
  });

  console.log('✅ Demo orders, transactions, and refunds seeded');

  // ─── Sakila-style payments ────────────────────────────────
  const sakilaPayments = [
    { payment_id: 1, customer_id: 1, staff_id: 1, rental_id: null, amount: toBob(2.99) },
    { payment_id: 2, customer_id: 1, staff_id: 1, rental_id: null, amount: toBob(4.99) },
    { payment_id: 3, customer_id: 2, staff_id: 2, rental_id: null, amount: toBob(0.99) },
    { payment_id: 4, customer_id: 3, staff_id: 1, rental_id: null, amount: toBob(2.99) },
    { payment_id: 5, customer_id: 4, staff_id: 2, rental_id: null, amount: toBob(4.99) },
  ];
  for (const p of sakilaPayments) {
    await prisma.payment.upsert({
      where: { payment_id: p.payment_id },
      update: {},
      create: p,
    });
  }
  console.log('✅ Sakila payments seeded');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Demo credentials:');
  console.log('   Admin:  admin@sakila-gateway.demo  / Admin@12345!');
  console.log('   Staff:  staff@sakila-gateway.demo  / Staff@12345!');
  console.log('   Viewer: viewer@sakila-gateway.demo / Viewer@12345!');
  console.log('\n⚠️  DEMO ENVIRONMENT - No real money is processed.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
