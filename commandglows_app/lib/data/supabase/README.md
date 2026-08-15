# Legacy Supabase adapter boundary

Supabase is a dormant compatibility adapter. Firebase is the active remote
backend selected by application providers.

All `supabase_flutter` imports and Supabase-specific repositories or stores must
remain in this directory, except for
`lib/core/bootstrap/supabase_bootstrap.dart`, which owns SDK initialization and
environment parsing. Product features consume backend-neutral domain
interfaces and must not expose `SupabaseClient`, Supabase response types, or
Supabase authentication events.

Before updating or removing `supabase_flutter`, validate this boundary with
`flutter test test/supabase_architecture_test.dart` and then run the complete
Flutter suite.
