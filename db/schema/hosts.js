const conn = require('../connector').default;
import Sequelize from 'sequelize';

const Hosts = conn.define('Hosts', {
    //id: { type: Sequelize.STRING, primaryKey: true },
    Host: { type: Sequelize.STRING, allowNull: false, defaultValue: '' },
    IP: { type: Sequelize.STRING, allowNull: false },
    User: { type: Sequelize.STRING, allowNull: false },
    Pass: { type: Sequelize.STRING,},
    Workdir: { type: Sequelize.STRING, defaultValue:'fraser/'},
    Netif: {type: Sequelize.STRING},
    Status: { type: Sequelize.STRING }
});


Hosts.sync({ force: false }).then(() => {

});

export default Hosts;



