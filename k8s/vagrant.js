const async = require('async');

import { startVagrant as startWorker } from '../k8s/worker'
import { startVagrant as startMaster } from '../k8s/master'
import { startVagrant as startEtcd } from '../k8s/etcd'

import { execShellCmds } from './ssh'

import { VMs, Hosts } from '../db'

const startVagrant = (nodes) => {
    
    async.eachSeries(nodes, (vname, cb)=>{ 
        VMs.findOne({
            where: { Name: vname}
        })
        .then((vm) => {
           if (vm.Type === 'etcd') {
               startEtcd(vname).then(()=>{
                   cb();
               }, cb);
           }

           if (vm.Type === 'master') {
               startMaster(vname).then(()=>{
                   cb();
               }, cb);
           }

           if (vm.Type === 'worker') {
               startWorker(vname).then(()=>{
                   cb();
               }, cb);
           }
        }).catch((ex)=>{
            cb(ex);
        });
    }, (err)=>{
        if (err) {
            console.log(err)
            
        }
    });
}

const vagrantHalt = (nodes) => {
    
    async.eachSeries(nodes, (vname, cb)=>{ 
        VMs.findOne({
            where: { Name: vname},
            include: {
                model: Hosts,
                as: 'Host',
            }
        })
        .then((vm) => {
            let host = {
                ip: vm.Host.IP,
                host: vm.Host.IP, //Host.Host,
                user: vm.Host.User,
                workdir: vm.Host.Workdir,
                netif: vm.Host.Netif,
                pass: 'Windows.'
            }
            execShellCmds(host, [`cd workdir/${vm.Type}s/${vm.Name}`, `Vagrant halt`])
            .then(()=>(cb()),(ex)=>(cb(ex)));
        });
    }, (err)=>{
        if (err) {
            console.log(err)
        }
    });
}

const vagrantDestroy = (nodes) => {
    
    async.eachSeries(nodes, (vname, cb)=>{ 
        VMs.findOne({
            where: { Name: vname},
            include: {
                model: Hosts,
                as: 'Host',
            }
        })
        .then((vm) => {
            let host = {
                ip: vm.Host.IP,
                host: vm.Host.IP, //Host.Host,
                user: vm.Host.User,
                workdir: vm.Host.Workdir,
                netif: vm.Host.Netif,
                pass: 'Windows.'
            }
            execShellCmds(host, [`cd workdir/${vm.Type}s/${vm.Name}`, `Vagrant halt`, `Vagrant destroy -f`])
            .then(()=>(cb()),(ex)=>(cb(ex)));
        });
    }, (err)=>{
        if (err) {
            console.log(err)
        }
    });
}

export { startVagrant, vagrantHalt, vagrantDestroy }