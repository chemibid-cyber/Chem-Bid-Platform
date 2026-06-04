-- Private bucket for auction spec sheets + COA uploads.
-- Files are accessed only via short-lived signed URLs minted server-side after
-- an authorization check (buyer, or a seller who has Accepted). No public reads.

insert into storage.buckets (id, name, public)
values ('auction-files', 'auction-files', false)
on conflict (id) do nothing;

-- No permissive storage.objects policies are added: the service role (server)
-- handles uploads and signed-URL minting; anon/authenticated cannot list/read
-- the bucket directly.
