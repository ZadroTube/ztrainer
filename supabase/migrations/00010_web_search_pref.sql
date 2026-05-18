-- Per-user toggle for letting the chat AI use Tavily web search.
-- Default false: existing users opt-in by flipping the switch on the Hub.
-- Users without `web_search_enabled = true` will never trigger Tavily,
-- which keeps the free tier (1000 searches/month) safe from accidental drain.

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS web_search_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.web_search_enabled IS
    'When true, chat AI may run a Tavily web search if the user message contains trigger words (regex match). When false, AI never uses web search.';
