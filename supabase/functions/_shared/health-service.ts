import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface HealthCheck {
  status: 'ok' | 'error'
  timestamp: string
  service: string
  version: string
}

interface DetailedHealthCheck extends HealthCheck {
  checks: {
    database?: {
      status: 'ok' | 'error'
      responseTime?: number
      timestamp?: string
      version?: string
      error?: string
    }
    supabase?: {
      status: 'ok' | 'error'
      responseTime?: string
      error?: string
    }
    environment?: {
      status: 'ok' | 'error'
      message?: string
      missing?: string[]
    }
  }
}

export const healthService = {
  /**
   * Get basic health status
   */
  getBasicHealth(): HealthCheck {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cleaning-management-api',
      version: '1.0.0'
    }
  },

  /**
   * Get detailed health status with dependency checks
   */
  async getDetailedHealth(supabaseClient: SupabaseClient): Promise<DetailedHealthCheck> {
    const healthStatus: DetailedHealthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cleaning-management-api',
      version: '1.0.0',
      checks: {}
    }

    let hasErrors = false

    // Check database connection and get PostgreSQL version via RPC
    try {
      const startTime = Date.now()
      const { data, error } = await supabaseClient
        .rpc('get_db_version')
      
      const responseTime = Date.now() - startTime
      
      if (error) {
        throw error
      }
      
      healthStatus.checks.database = {
        status: 'ok',
        responseTime,
        timestamp: new Date().toISOString(),
        version: data || 'PostgreSQL Connected'
      }
    } catch (error) {
      hasErrors = true
      healthStatus.checks.database = {
        status: 'error',
        error: error.message
      }
    }

    // Check Supabase API connection
    try {
      const startTime = Date.now()
      const { data, error } = await supabaseClient.auth.getSession()
      const responseTime = Date.now() - startTime
      
      if (error) {
        throw error
      }
      
      healthStatus.checks.supabase = {
        status: 'ok',
        responseTime: `${responseTime}ms`
      }
    } catch (error) {
      hasErrors = true
      healthStatus.checks.supabase = {
        status: 'error',
        error: error.message
      }
    }

    // Check environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(varName => !Deno.env.get(varName))
    
    if (missingEnvVars.length > 0) {
      hasErrors = true
      healthStatus.checks.environment = {
        status: 'error',
        missing: missingEnvVars
      }
    } else {
      healthStatus.checks.environment = {
        status: 'ok',
        message: 'All required environment variables are set'
      }
    }

    // Overall status
    if (hasErrors) {
      healthStatus.status = 'error'
    }

    return healthStatus
  }
}