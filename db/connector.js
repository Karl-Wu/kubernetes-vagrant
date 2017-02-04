
import Sequelize from 'sequelize';

let conn = null;

if (!conn) {
    conn = new Sequelize('hosts', null, null, {
        host: 'localhost',
        dialect: 'sqlite',
        storage: './hosts.sqlite',
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        },

    });
}

export default conn;