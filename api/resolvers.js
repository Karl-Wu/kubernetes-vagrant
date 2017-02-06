import { Hosts, VMs, IPv4Pools, AddrUseds } from '../db'
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
        createVM: (root, args) => {
            return VMs.create(args);
        },
        deployVM: (root, args) => {
            Hosts.findOne({ where: { Host: args.Host } }).then((host) => {
                console.log(args, host);
                return VMs.update({ HostId: host.id }, { where: { Name: args.Name } });
            });
        },
        destroyVM: (root, args) => {
            return VMs.findOne({ where: { Name: args.Name } }).then((vm) => {
                vm.destroy();
            });
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
        vagrantUP: (root, args) => {
            console.log(args);
            return startVagrant(args.nodes);
        },
        vagrantHalt: (root, args) => {
            console.log(args);
            return vagrantHalt(args.nodes);
        },

        vagrantDestroy: (root, args) => {
            console.log(args);
            return vagrantDestroy(args.nodes);
        },
    },
    VM: {
        Host: (vm) => {
            return Hosts.findOne({ where: { id: vm.HostId } })
        }
    },
    AddrUsed: {
        Address: (item) => {
            var ip = new Address4.fromInteger(item.Address);
            return ip.correctForm();
        }
    }
};

export default resolvers;
