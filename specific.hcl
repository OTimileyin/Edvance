# Edvance — infrastructure definition for Specific.
#
# The same file drives local development (`specific dev`) and production
# (`specific deploy`). Connection details reach the app as environment
# variables, so the application code stays unchanged.

build "web" {
  base    = "node"
  command = "npm run build"
}

service "web" {
  build   = build.web
  command = "npm start"

  endpoint {
    public = true
    # The app's own readiness probe: 200 when the database is reachable, 503 when
    # it is not, so the platform sees a genuinely unhealthy instance.
    health_check {
      path = "/api/health"
    }
  }

  env = {
    PORT               = port
    NODE_ENV           = "production"
    DATABASE_URL       = postgres.main.url
    BETTER_AUTH_URL    = "https://${service.web.public_url}"
    BETTER_AUTH_SECRET = secret.better_auth_secret

    # --- AI (Google Gemini) -------------------------------------------------
    # Without GEMINI_API_KEY the app runs, but every analysis action honestly
    # reports that analysis is not configured. The mock provider is refused in
    # production, so it can never answer a real learner here.
    GEMINI_API_KEY = secret.gemini_api_key
    GEMINI_MODEL   = "gemini-3.5-flash"

    # --- File storage (Supabase, private bucket) ----------------------------
    # Without these the app runs, but uploads honestly report that storage is not
    # configured instead of failing obscurely.
    SUPABASE_URL            = secret.supabase_url
    SUPABASE_SECRET_KEY     = secret.supabase_secret_key
    SUPABASE_STORAGE_BUCKET = secret.supabase_storage_bucket

    # --- Transactional email (Resend, optional) -----------------------------
    # Only the account-deletion confirmation uses email. When unset, the API
    # reports that it did not send one rather than pretending otherwise.
    RESEND_API_KEY = secret.resend_api_key
    EMAIL_FROM     = secret.email_from
  }

  # Schema migrations run before each rollout, with the deployed database's
  # DATABASE_URL in the environment. They apply db/migrations/*.sql once each
  # and are safe to re-run.
  pre_deploy {
    command = "node scripts/migrate.mjs"
  }

  # Local development runs the Next.js dev server (hot reload) instead of the
  # production build, and uses plain HTTP for the auth base URL.
  dev {
    command = "npm run dev"

    env = {
      BETTER_AUTH_URL = "http://${service.web.public_url}"
    }
  }
}

postgres "main" {}

# Provided by the operator before the first deploy (values are never committed):
#   gemini_api_key, supabase_url, supabase_secret_key, supabase_storage_bucket
secret "gemini_api_key" {}
secret "supabase_url" {}
secret "supabase_secret_key" {}
secret "supabase_storage_bucket" {}

# Optional: leave unset to run without transactional email.
secret "resend_api_key" {}
secret "email_from" {}

secret "better_auth_secret" {
  # Better Auth signs sessions with this; Specific generates and stores it, so
  # it never lives in the repository.
  generated = true
}
