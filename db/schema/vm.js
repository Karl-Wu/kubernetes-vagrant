const conn = require('../connector').default;
import Sequelize from 'sequelize';
import uuid from 'node-uuid';

import Hosts from './hosts';

const VMs = conn.define('VMs', {
    Name: { type: Sequelize.STRING, allowNull: false, unique: true },
    Type: { type: Sequelize.ENUM('etcd', 'master', 'worker') },
    IP: {
        type: Sequelize.STRING, allowNull: false, unique: true,
        validate: {
            isIP: true,
        }
    },
    Memory: { type: Sequelize.INTEGER, default: 512 },
    Setting: {
        type: Sequelize.TEXT
    },
});


VMs.belongsTo(Hosts, { as: 'Host' });
VMs.sync({ force: false }).then(() => {

});

Hosts.hasMany(VMs, { as: 'VMs' });

export default VMs;



