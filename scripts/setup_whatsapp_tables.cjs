const postgres = require(require.resolve('postgres', { paths: ['packages/database'] }));
const sql = postgres(process.env.DATABASE_URL || 'postgresql://haip:haip@localhost:5432/haip');

async function main() {
  console.log('Setting up WhatsApp & AI Receptionist database tables...');

  // 1. WhatsApp Conversations
  await sql`
    CREATE TABLE IF NOT EXISTS whatsapp_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id UUID NOT NULL REFERENCES properties(id),
      guest_phone VARCHAR(50) NOT NULL,
      guest_name VARCHAR(150),
      guest_id UUID REFERENCES guests(id),
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      ai_status VARCHAR(20) NOT NULL DEFAULT 'active',
      session_state JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      unread_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_whatsapp_conv_property_phone UNIQUE (property_id, guest_phone)
    )
  `;
  console.log('Created or verified whatsapp_conversations table.');

  // 2. WhatsApp Messages
  await sql`
    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
      property_id UUID NOT NULL REFERENCES properties(id),
      direction VARCHAR(10) NOT NULL,
      sender_type VARCHAR(20) NOT NULL,
      sender_id UUID,
      message_id VARCHAR(150) NOT NULL,
      body TEXT NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(20) NOT NULL DEFAULT 'received',
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('Created or verified whatsapp_messages table.');

  // 3. Create index for fast message lookup
  await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_conv ON whatsapp_messages (conversation_id, created_at ASC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_wamid ON whatsapp_messages (message_id)`;
  console.log('Created indexes for WhatsApp tables.');

  await sql.end();
  console.log('WhatsApp database tables setup successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
