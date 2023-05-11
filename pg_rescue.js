// SPDX-License-Identifier: GPL-3.0-or-later
const spawn = require('child_process').spawn;

let table = '';
let dashdash = false;
const cmd = [];
for (arg of process.argv.slice(1)) {
    if (dashdash) {
        cmd.push(arg);
    } else if (arg === '--') {
        dashdash = true
    } else {
        table = arg;
    }
}
if (table === '' || !dashdash || cmd.length < 1) {
    console.log("Usage: pg_rescue <broken_table> -- <psql command>");
    console.log("   EG: pg_rescue objects -- sudo -u postgres -d pleroma");
    console.log("   # Copy the 'objects' table in a database called pleroma");
    return;
}

// create table like
const DATABASE = cmd[0];
const BROKEN_TABLE = cmd[1];
const FIX_TABLE = `pg_rescue_${BROKEN_TABLE}`;
                                                                                                                                                                                                            
const sql = (pad, stmt, cb) => {
    console.log(pad + " " + stmt); 
    let cp;
    if (sudo_user) {                                                                   
        cp = spawn("sudo", ["-u", sudo_user, "psql", "-d", DATABASE], {});
    } else {
        cp = spawn("psql", ["-d", DATABASE], {});
    }
    const data = [];                     
    const err = [];        
    cp.stdout.on('data', (d) => data.push(d.toString('utf8')));     
    cp.stderr.on('data', (d) => err.push(d.toString('utf8')));
    cp.on('close', () => {                  
        cb(err.join(''), data.join(''));                                                              
    });                                           
    cp.stdin.end(stmt); 
};     
                                                   
let broken_record_ids = [];

const cycle = (begin, end, pad, done) => {
    console.log(pad + ` Trying: (${begin} - ${end})`);
    const q = `SELECT * from ${BROKEN_TABLE} WHERE id >= ${begin} AND id < ${end}`;
    sql(pad, `INSERT INTO ${FIX_TABLE} (${q});`, (err, ret) => {
        if (/ERROR:/.test(err)) {
            console.log(pad + ' ' + err.replace(/\n/g, ' '));
            if ((end - begin) === 1) {
                broken_record_ids.push(begin);
                console.log(`Found corrupted record (${begin}), skipping`);
                return void done();
            }
            const mid = (end - begin) / 2;
            if (mid !== Math.abs(Math.round(mid))) { throw new Error(`mid ${mid} is not a positive integer`); }
            cycle(begin, begin + mid, pad + 'a', () => {
                cycle(begin + mid, end, pad + 'b', done);
            });
        } else {
            done();
        }
    });
};
const two = (startPoint) => {
    sql('', `DROP TABLE ${FIX_TABLE}`, (_err, _ret) => {
        sql('', `CREATE TABLE ${FIX_TABLE} (LIKE ${BROKEN_TABLE})`, (err, _ret) => {
            if (err != '') {
                throw new Error(`Unable to make new table: ${err}`);
            }
            cycle(0, startPoint, '', () => {
                console.log(`Complete with broken row ids: (${broken_record_ids.join(',')})`);
            });
        });
    });
};
const one = () => {
    sql('', `COPY (SELECT id FROM ${BROKEN_TABLE} ORDER BY id DESC LIMIT 1) TO stdout`, (err, ret) => {
        if (err != '') {
            throw new Error(`Unable to count table: ${err}`);
        }
        const count = Number(ret.trim());
        if (isNaN(count)) {
            throw new Error(`Unable to parse count: ${ret.trim()}`);
        }
        console.log("Got max id: " + count);
        const startPoint = 2 ** Math.ceil(Math.log2(count));
        console.log("Start point: " + startPoint);
        two(startPoint);
    });
};
one();