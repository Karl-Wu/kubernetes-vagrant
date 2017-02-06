const conn = require('../connector').default;
import Sequelize from 'sequelize';
import ipAddr from 'ip-address';

const IPv4Pools = conn.define('IPv4Pools', {
    Name: { type: Sequelize.STRING, allowNull: false, unique: true },
    Network: { type: Sequelize.INTEGER },
    PrefixLen: {
        type: Sequelize.INTEGER, validate: {
            min: 1,
            max: 31,
        }
    },
    StartIP: { type: Sequelize.INTEGER },
    EndIP: { type: Sequelize.INTEGER },
});

const AddrUseds = conn.define('AddrUseds', {
    Address: { type: Sequelize.INTEGER, unique: true },
    Owner: { type: Sequelize.TEXT },
});



AddrUseds.belongsTo(IPv4Pools, {onDelete: 'CASCADE'});
IPv4Pools.hasMany(AddrUseds);

AddrUseds.sync({ force: false }).then(() => {

});
IPv4Pools.sync({ force: false }).then(() => {

});


function v4AddrArraytoInt(v4) {
    var res = 0;
    if (v4.length < 4) {
        return 0;
    }
    res = v4[0]
    res = res * 256 + v4[1]
    res = res * 256 + v4[2]
    res = res * 256 + v4[3]

    return res;
}

IPv4Pools.createPool = (values) => {
    console.log(values);
    let {Name, Network, PrefixLen, StartIP, EndIP} = values;
    let ip = new ipAddr.Address4(Network + '/' + PrefixLen);
    let start = v4AddrArraytoInt(ip.startAddress().toArray());
    let end = v4AddrArraytoInt(ip.endAddress().toArray());

    if (!StartIP || (typeof StartIP !== 'number')) {
        StartIP = start;
    } else {
        StartIP = Math.max(start, StartIP);
    }

    if (!EndIP || (typeof EndIP !== 'number')) {
        EndIP = end;
    } else {
        EndIP = Math.min(end, EndIP);
    }

    return IPv4Pools.create({
        Name,
        Network,
        PrefixLen,
        StartIP,
        EndIP,
    })
};

IPv4Pools.deletePool = ({Name}) => {
    /*IPv4Pools.findOne({where:{Name:Name}}).then((pool)=>{
        return pool.destroy();
    });*/
    return IPv4Pools.destroy({
        where:{Name:Name}
    })
};

IPv4Pools.allocIP = ({Name, Who}) => {

    return AddrUseds.findOne({
        where: { Owner: Who },
        include: {
            model: IPv4Pools,
            where: {Name: Name}
        }
    }).then((addr) => {
       if (addr) {
           return addr
       }

       return IPv4Pools.findOne({
            where: { Name: Name },
            include: {
                model: AddrUseds,
                as: 'AddrUseds',
            }
        })
        .then((pool) => {
            var start = pool.StartIP;
            var end = pool.EndIP;
            var usedMap = {};

            pool.AddrUseds.map((ip) => {
                usedMap[ip.Address] = true;
            });

            for (var n = start + 2; n < end; n++) {  //skip first 2 addresses
                if (!usedMap[n]) {
                    return pool.createAddrUsed({ Address: n, Owner: Who }).then((inst)=>{
                        return inst;
                    });
                }
            }
        }).catch((err) => {
            console.log(err);
        })
    })

};

export { IPv4Pools, AddrUseds };



