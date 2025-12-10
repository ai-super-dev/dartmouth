import { Context } from 'hono';

// Get tenant settings
export async function getTenantSettings(c: Context) {
  try {
    const db = c.env.DB;
    
    const result = await db.prepare(`
      SELECT * FROM tenant_settings WHERE tenant_id = 'default'
    `).first();
    
    if (!result) {
      // Return defaults if no settings exist
      return c.json({
        tenant_id: 'default',
        business_name: 'My Business',
        business_email: '',
        business_phone: '',
        business_address: '',
        business_website: '',
        timezone: 'Australia/Brisbane',
        language: 'en-AU',
        measurement_system: 'metric',
        currency: 'AUD',
        currency_symbol: '$',
        date_format: 'DD/MM/YYYY',
        time_format: '12h'
      });
    }
    
    return c.json(result);
  } catch (error: any) {
    console.error('Error fetching tenant settings:', error);
    return c.json({ error: 'Failed to fetch tenant settings' }, 500);
  }
}

// Update tenant settings
export async function updateTenantSettings(c: Context) {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    
    const {
      business_name,
      business_email,
      business_phone,
      business_address,
      business_website,
      timezone,
      language,
      measurement_system,
      currency,
      currency_symbol,
      date_format,
      time_format
    } = body;
    
    // Check if settings exist
    const existing = await db.prepare(`
      SELECT tenant_id FROM tenant_settings WHERE tenant_id = 'default'
    `).first();
    
    if (existing) {
      // Update existing
      await db.prepare(`
        UPDATE tenant_settings SET
          business_name = ?,
          business_email = ?,
          business_phone = ?,
          business_address = ?,
          business_website = ?,
          timezone = ?,
          language = ?,
          measurement_system = ?,
          currency = ?,
          currency_symbol = ?,
          date_format = ?,
          time_format = ?,
          updated_at = datetime('now')
        WHERE tenant_id = 'default'
      `).bind(
        business_name || 'My Business',
        business_email || '',
        business_phone || '',
        business_address || '',
        business_website || '',
        timezone || 'Australia/Brisbane',
        language || 'en-AU',
        measurement_system || 'metric',
        currency || 'AUD',
        currency_symbol || '$',
        date_format || 'DD/MM/YYYY',
        time_format || '12h'
      ).run();
    } else {
      // Insert new
      await db.prepare(`
        INSERT INTO tenant_settings (
          tenant_id, business_name, business_email, business_phone,
          business_address, business_website, timezone, language,
          measurement_system, currency, currency_symbol, date_format, time_format
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        'default',
        business_name || 'My Business',
        business_email || '',
        business_phone || '',
        business_address || '',
        business_website || '',
        timezone || 'Australia/Brisbane',
        language || 'en-AU',
        measurement_system || 'metric',
        currency || 'AUD',
        currency_symbol || '$',
        date_format || 'DD/MM/YYYY',
        time_format || '12h'
      ).run();
    }
    
    return c.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    console.error('Error updating tenant settings:', error);
    return c.json({ error: 'Failed to update tenant settings' }, 500);
  }
}

// Get available options for dropdowns
export async function getTenantSettingsOptions(_c: Context) {
  return _c.json({
    timezones: [
      { value: 'Australia/Brisbane', label: 'Australia/Brisbane (AEST)' },
      { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
      { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST/AEDT)' },
      { value: 'Australia/Perth', label: 'Australia/Perth (AWST)' },
      { value: 'Australia/Adelaide', label: 'Australia/Adelaide (ACST/ACDT)' },
      { value: 'Pacific/Auckland', label: 'New Zealand (NZST/NZDT)' },
      { value: 'America/New_York', label: 'US Eastern (EST/EDT)' },
      { value: 'America/Chicago', label: 'US Central (CST/CDT)' },
      { value: 'America/Denver', label: 'US Mountain (MST/MDT)' },
      { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)' },
      { value: 'Europe/London', label: 'UK (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
      { value: 'Asia/Tokyo', label: 'Japan (JST)' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    ],
    languages: [
      { value: 'en-AU', label: 'Australian English', spelling: 'colour, metre, organisation' },
      { value: 'en-GB', label: 'British English', spelling: 'colour, metre, organisation' },
      { value: 'en-US', label: 'American English', spelling: 'color, meter, organization' },
      { value: 'en-CA', label: 'Canadian English', spelling: 'colour, meter, organization' },
      { value: 'en-NZ', label: 'New Zealand English', spelling: 'colour, metre, organisation' },
    ],
    measurementSystems: [
      { value: 'metric', label: 'Metric (cm, kg, km, °C)' },
      { value: 'imperial', label: 'Imperial (in, lb, mi, °F)' },
    ],
    currencies: [
      { value: 'AUD', symbol: '$', label: 'Australian Dollar (AUD)' },
      { value: 'USD', symbol: '$', label: 'US Dollar (USD)' },
      { value: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
      { value: 'EUR', symbol: '€', label: 'Euro (EUR)' },
      { value: 'NZD', symbol: '$', label: 'New Zealand Dollar (NZD)' },
      { value: 'CAD', symbol: '$', label: 'Canadian Dollar (CAD)' },
      { value: 'SGD', symbol: '$', label: 'Singapore Dollar (SGD)' },
      { value: 'JPY', symbol: '¥', label: 'Japanese Yen (JPY)' },
      { value: 'HKD', symbol: '$', label: 'Hong Kong Dollar (HKD)' },
    ],
    dateFormats: [
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)', example: '31/12/2025' },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)', example: '12/31/2025' },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)', example: '2025-12-31' },
      { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2025)', example: '31-12-2025' },
      { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2025)', example: '31.12.2025' },
    ],
    timeFormats: [
      { value: '12h', label: '12-hour (2:30 PM)' },
      { value: '24h', label: '24-hour (14:30)' },
    ],
  });
}

// Get agent regional overrides
export async function getAgentOverrides(c: Context) {
  try {
    const db = c.env.DB;
    const agentId = c.req.param('agentId') || 'customer-service-agent';
    
    const result = await db.prepare(`
      SELECT * FROM agent_regional_overrides WHERE agent_id = ?
    `).bind(agentId).first();
    
    // Return empty overrides if none exist (all null = inherit from tenant)
    return c.json(result || {
      agent_id: agentId,
      timezone: null,
      language: null,
      measurement_system: null,
      currency: null,
      currency_symbol: null,
      date_format: null,
      time_format: null
    });
  } catch (error: any) {
    console.error('Error fetching agent overrides:', error);
    return c.json({ error: 'Failed to fetch agent overrides' }, 500);
  }
}

// Update agent regional overrides
export async function updateAgentOverrides(c: Context) {
  try {
    const db = c.env.DB;
    const agentId = c.req.param('agentId') || 'customer-service-agent';
    const body = await c.req.json();
    
    const {
      timezone,
      language,
      measurement_system,
      currency,
      currency_symbol,
      date_format,
      time_format
    } = body;
    
    // Check if overrides exist
    const existing = await db.prepare(`
      SELECT agent_id FROM agent_regional_overrides WHERE agent_id = ?
    `).bind(agentId).first();
    
    if (existing) {
      await db.prepare(`
        UPDATE agent_regional_overrides SET
          timezone = ?,
          language = ?,
          measurement_system = ?,
          currency = ?,
          currency_symbol = ?,
          date_format = ?,
          time_format = ?,
          updated_at = datetime('now')
        WHERE agent_id = ?
      `).bind(
        timezone || null,
        language || null,
        measurement_system || null,
        currency || null,
        currency_symbol || null,
        date_format || null,
        time_format || null,
        agentId
      ).run();
    } else {
      await db.prepare(`
        INSERT INTO agent_regional_overrides (
          agent_id, timezone, language, measurement_system,
          currency, currency_symbol, date_format, time_format
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        agentId,
        timezone || null,
        language || null,
        measurement_system || null,
        currency || null,
        currency_symbol || null,
        date_format || null,
        time_format || null
      ).run();
    }
    
    return c.json({ success: true, message: 'Agent overrides saved successfully' });
  } catch (error: any) {
    console.error('Error updating agent overrides:', error);
    return c.json({ error: 'Failed to update agent overrides' }, 500);
  }
}

// Clear agent overrides (reset to inherit from tenant)
export async function clearAgentOverrides(c: Context) {
  try {
    const db = c.env.DB;
    const agentId = c.req.param('agentId') || 'customer-service-agent';
    
    await db.prepare(`
      DELETE FROM agent_regional_overrides WHERE agent_id = ?
    `).bind(agentId).run();
    
    return c.json({ success: true, message: 'Agent overrides cleared' });
  } catch (error: any) {
    console.error('Error clearing agent overrides:', error);
    return c.json({ error: 'Failed to clear agent overrides' }, 500);
  }
}
