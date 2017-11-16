const conn = require('../connector').default;
import Sequelize from 'sequelize';
import uuid from 'node-uuid';

import Hosts from './hosts';

const VMs = conn.define('VMs', {
    Name: { type: Sequelize.STRING, allowNull: false, unique: 'nodeIndex' },
    Type: { type: Sequelize.ENUM('etcd', 'master', 'worker') },
    IP: {
        type: Sequelize.STRING, allowNull: false,
        validate: {
            isIP: true,
        }
    },
    Memory: { type: Sequelize.INTEGER, default: 1024 },
    ClusterId: { type: Sequelize.STRING, unique: 'nodeIndex'},
    Setting: {
        type: Sequelize.TEXT
    },
});

/*
        this.Name = json.Name;
        this.PODNet = json.PODNet;
        this.ServiceNet = json.ServiceNet;
        this.K8sIP = json.K8sIP;
        this.DNSIP = json.DNSIP;
*/
const Clusters = conn.define('Clusters', {
    Name: { type: Sequelize.STRING, allowNull: false, unique: true },
    PODNet: { type: Sequelize.STRING, allowNull: false, default: "10.2.0.0/16"},
    ServiceNet: { type: Sequelize.STRING, allowNull: false, default: "10.3.0.0/24"},
    K8sIP: { type: Sequelize.STRING, allowNull: false, default: "10.3.0.1"},
    DNSIP: { type: Sequelize.STRING, allowNull: false, default: "10.3.0.10"},
});


VMs.belongsTo(Hosts, { as: 'Host' });
VMs.belongsTo(Clusters, {onDelete: 'CASCADE'});
Clusters.hasMany(VMs);

VMs.sync({ force: false }).then(() => {

});

Clusters.sync({ force: false }).then(() => {

});
Hosts.hasMany(VMs, { as: 'VMs' });

export {Clusters, VMs}



