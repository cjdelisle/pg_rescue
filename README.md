# pg_rescue

If you have tragic postgres database corruption to the point that you are unable to dump the db,
this tool will copy the broken table to a new table by bisection, skipping records which cannot
be copied.

After this, you should be able to drop the broken table and then be able to dump the database
to where you can re-import it to safety.

## Usage

`node pg_rescue.js <broken table> -- <psql command>`

Recover a table called `objects` from a database called `pleroma`:
`node pg_rescue.js objects -- sudo -u postgres psql -d pleroma`

After this completes, you will have a new table called `pg_rescue_objects` (assuming your
original table name was `objects`).

NOTE: THIS SCRIPT DROPS `pg_rescue_<tablename>` WITHOUT ASKING. If you have a table name starting
with `pg_rescue_`, be careful.

## License
GPL-3.0-or-later