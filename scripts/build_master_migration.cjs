const fs = require('fs');
const path = require('path');

const sqlDir = path.join(__dirname, '..', 'supabase', 'sql');
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const outputFile = path.join(migrationsDir, '20261115000000_hotel_spark_complete_supabase_schema.sql');

const files = [
  '01_core.sql',
  '02_room_management.sql',
  '03_guest_management.sql',
  '04_booking_management.sql',
  '05_payments_and_billing.sql',
  '06_front_desk_and_ops.sql',
  '07_finance_notifications_security.sql',
  '08_direct_booking_workflow_functions.sql',
  '09_row_level_security.sql',
  '10_seed_hotel_spark_data.sql',
  '11_storage_setup.sql'
];

let masterSql = `-- ============================================================================
-- HOTEL SPARK / HAIP – COMPLETE SUPABASE PRODUCTION DATABASE SCHEMA
-- Target Database: Supabase PostgreSQL (or Local HAIP Database)
-- Generated: ${new Date().toISOString()}
-- Modules:
--   1. Core (hotels, properties, profiles, hotel_members, user_roles, hotel_settings)
--   2. Room Management (room_types, rooms, room_images, rate_plans, room_blocks)
--   3. Guest Management (guests, guest_documents)
--   4. Booking Management (booking_requests, bookings, reservations, reservation_rooms)
--   5. Payments & Billing (folios, payments, invoices, refunds, cashier_transactions)
--   6. Front Desk & Ops (check_ins, check_outs, housekeeping_tasks, maintenance_requests)
--   7. Finance, Notifications & Security (expenses, notifications, audit_logs)
--   8. Direct Booking Workflow Functions (submit, approve, reject, revalidate)
--   9. Supabase Row Level Security (RLS) & Multi-Tenant Access Policies
--  10. Hotel Spark Seed Data (Property a0000001-0000-4000-a000-000000000001)
--  11. Supabase Storage Buckets & Policies
-- ============================================================================

`;

for (const file of files) {
  const filePath = path.join(sqlDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(1);
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Idempotent triggers: ensure DROP TRIGGER IF EXISTS precedes CREATE TRIGGER
  // Match pattern: CREATE TRIGGER <name> [newlines/spaces] BEFORE|AFTER ... ON <table>
  content = content.replace(/(?:DROP TRIGGER IF EXISTS\s+\w+\s+ON\s+\w+;\s*)?CREATE TRIGGER\s+(\w+)\s+([\s\S]*?\s+ON\s+(\w+))/gi, (match, trgName, rest, tblName) => {
    return `DROP TRIGGER IF EXISTS ${trgName} ON ${tblName};\nCREATE TRIGGER ${trgName} ${rest}`;
  });

  masterSql += `\n-- ----------------------------------------------------------------------------\n`;
  masterSql += `-- SECTION: ${file}\n`;
  masterSql += `-- ----------------------------------------------------------------------------\n\n`;
  masterSql += content.trim() + `\n\n`;
}

fs.writeFileSync(outputFile, masterSql, 'utf8');
console.log(`Successfully built master migration: ${outputFile} (${(masterSql.length / 1024).toFixed(1)} KB)`);
