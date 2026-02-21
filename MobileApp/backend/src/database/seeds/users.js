// Seed: Users (15 users - all roles and edge cases)
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const hash = (password) => bcrypt.hashSync(password, 10);

module.exports = async function seedUsers(db, { log }) {
  log('Seeding users (15 users - all roles and edge cases)...');

  const users = [
    // OWNER - Full access
    {
      id: uuidv4(),
      username: 'owner',
      email: 'owner@premiumgiftbox.com',
      password_hash: hash('owner123'),
      role: 'owner',
      full_name: 'Budi Santoso',
      phone: '+62-812-1111-0001',
      is_active: 1,
    },

    // MANAGERS - Active
    {
      id: uuidv4(),
      username: 'manager',
      email: 'manager@premiumgiftbox.com',
      password_hash: hash('manager123'),
      role: 'manager',
      full_name: 'Siti Rahayu',
      phone: '+62-812-1111-0002',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'manager2',
      email: 'manager2@premiumgiftbox.com',
      password_hash: hash('manager123'),
      role: 'manager',
      full_name: 'Ahmad Fauzi',
      phone: '+62-812-1111-0003',
      is_active: 1,
    },

    // EMPLOYEES - Active (various roles)
    {
      id: uuidv4(),
      username: 'employee1',
      email: 'andi@premiumgiftbox.com',
      password_hash: hash('employee123'),
      role: 'employee',
      full_name: 'Andi Wijaya',
      phone: '+62-812-1111-0004',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'employee2',
      email: 'dewi@premiumgiftbox.com',
      password_hash: hash('employee123'),
      role: 'employee',
      full_name: 'Dewi Lestari',
      phone: '+62-812-1111-0005',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'employee3',
      email: 'rudi@premiumgiftbox.com',
      password_hash: hash('employee123'),
      role: 'employee',
      full_name: 'Rudi Hartono',
      phone: '+62-812-1111-0006',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'designer',
      email: 'maya@premiumgiftbox.com',
      password_hash: hash('designer123'),
      role: 'employee',
      full_name: 'Maya Sari',
      phone: '+62-812-1111-0007',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'qc_staff',
      email: 'qc@premiumgiftbox.com',
      password_hash: hash('qc123'),
      role: 'employee',
      full_name: 'Quality Control Staff',
      phone: '+62-812-1111-0008',
      is_active: 1,
    },

    // INACTIVE USERS (edge cases)
    {
      id: uuidv4(),
      username: 'inactive_employee',
      email: 'inactive@premiumgiftbox.com',
      password_hash: hash('inactive123'),
      role: 'employee',
      full_name: 'Inactive Employee',
      phone: '+62-812-1111-0009',
      is_active: 0,
    },
    {
      id: uuidv4(),
      username: 'resigned_manager',
      email: 'resigned@premiumgiftbox.com',
      password_hash: hash('resigned123'),
      role: 'manager',
      full_name: 'Resigned Manager',
      phone: '+62-812-1111-0010',
      is_active: 0,
    },

    // EDGE CASES
    {
      id: uuidv4(),
      username: 'test_user',
      email: 'test@premiumgiftbox.com',
      password_hash: hash('test123'),
      role: 'employee',
      full_name: 'Test User',
      phone: '+62-812-1111-0011',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'user_no_phone',
      email: 'nophone@premiumgiftbox.com',
      password_hash: hash('nophone123'),
      role: 'employee',
      full_name: 'User Without Phone',
      phone: null,
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'long_username_user',
      email: 'longname@premiumgiftbox.com',
      password_hash: hash('longname123'),
      role: 'employee',
      full_name: 'User With A Very Long Full Name That Tests Character Limits',
      phone: '+62-812-1111-0012',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'special_chars',
      email: 'special.user+test@premiumgiftbox.com',
      password_hash: hash('special123'),
      role: 'employee',
      full_name: "User O'Brien-Smith",
      phone: '+62-812-1111-0013',
      is_active: 1,
    },
    {
      id: uuidv4(),
      username: 'new_hire',
      email: 'newhire@premiumgiftbox.com',
      password_hash: hash('newhire123'),
      role: 'employee',
      full_name: 'Brand New Employee',
      phone: '+62-812-1111-0014',
      is_active: 1,
    },
  ];

  const insertUser = db.prepare(
    `INSERT INTO users (id, username, email, password_hash, role, full_name, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  users.forEach((u) =>
    insertUser.run(
      u.id,
      u.username,
      u.email,
      u.password_hash,
      u.role,
      u.full_name,
      u.phone,
      u.is_active
    )
  );
  log(`   Created ${users.length} users`);

  // Return user references needed by other seed modules
  const ownerId = users[0].id;
  const managerId = users[1].id;
  const employeeIds = users.filter((u) => u.role === 'employee' && u.is_active).map((u) => u.id);

  return { users, ownerId, managerId, employeeIds };
};
