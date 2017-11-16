import { Hosts, VMs, IPv4Pools, AddrUseds, Clusters } from '../db'
import { Address4 } from 'ip-address';

import { startVagrant, vagrantHalt, vagrantDestroy } from '../k8s/vagrant'

const resolvers = {
    Query: {
        hosts: (root, args) => {
            if (args.length === 0) {
                return Hosts.findAll();
            }
            return Hosts.findAll({ where: args });
        },
        Clusters: (root, args) => {
            return Clusters.findAll({ where: args });
        },
        VMs: (root, args) => {
            console.log(args);

            if (args.length === 0) {
                return Hosts.findAll();
            }
            return VMs.findAll({ where: args });
        },
        IPv4Pools: (root, args) => {

            let c = {
                include: {
                    model: AddrUseds,
                    as: 'AddrUseds',
                }
            };
            if (args.length !== 0) {
                c.where = { ...args };
            }

            console.log(c);
            return IPv4Pools.findAll(c);
        },
        TestEntry: (root, args) => {

            //return startVagrant('vm5');
        }
    },
    Mutation: {
        createHost: (root, args) => {
            return Hosts.create(args);
        },

        upsertHost: (root, args) => {
            return Hosts.upsert(args)
        },


        upsertCluster: (root, args) => {
            return Clusters.upsert(args)
        },

        destroyCluster: (root, args) => {
            return Clusters.destroy({ where: { $or:{ Name: args.Name, id: args.id} }});
        },
        
        upsertVM: (root, args) => {
            return VMs.upsert(args);
        },

        deployVM: (root, args) => {
            /*Hosts.findOne({ where: { Host: args.Host } }).then((host) => {
                console.log(args, host);
                return VMs.update({ HostId: host.id }, { where: { Name: args.Name } });
            });*/
            return VMs.upsert(args);
        },
        destroyVM: (root, args) => {
            return VMs.destroy({ where: { id: args.id } });
        },
        
        createIPv4Pool: (root, args) => {
            console.log(args);
            return IPv4Pools.createPool(args);
        },
        deleteIPv4Pool: (root, args) => {
            console.log(args);
            return IPv4Pools.deletePool(args);
        },
        allocIP: (root, args) => {
            console.log(args);
            return IPv4Pools.allocIP(args);
        },
        releaseIP: (root, args) => {
            console.log(args);
            return IPv4Pools.releaseIP(args)
        },
        vagrantUP: (root, args) => {
            console.log(args);
            return startVagrant(args);
        },
        vagrantHalt: (root, args) => {
            console.log(args);
            return vagrantHalt(args);
        },

        vagrantDestroy: (root, args) => {
            console.log(args);
            return vagrantDestroy(args);
        },
    },
    VM: {
        Host: (vm) => {
            return Hosts.findOne({ where: { id: vm.HostId } })
        }
    },
    Cluster: {
        Nodes: (c) => {
            return VMs.findAll({ where: { ClusterId: c.id } })
        }
    },

    AddrUsed: {
        Address: (item) => {
            var ip = new Address4.fromInteger(item.Address);
            return ip.correctForm();
        }, 
        Owner: (item) => {
            return JSON.parse(item.Owner)
            //return VMs.findOne({ where: { Name: item.Owner } })
        }
    }
};

export default resolvers;
