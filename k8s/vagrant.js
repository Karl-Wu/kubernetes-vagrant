const async = require('async');

import { startVagrant as startWorker } from '../k8s/worker'
import { startVagrant as startMaster } from '../k8s/master'
import { startVagrant as startEtcd } from '../k8s/etcd'

import { execShellCmds } from './ssh'
import { genRootCA, genAdminKeyPair, genMachineSSL,  clearDir, setupDir } from './ssl'

import { VMs, Hosts, Clusters } from '../db'

const startVagrant = ({cluster, nodes}) => {
    let cObj;
    let cname;

    Clusters.findOne({
        where: { Name: cluster } 
    })
    .then( (cl) =>{ 
        cObj = cl;
        cname = cObj.Name;
        console.log(cl.id, typeof cl.id, cl.Name)
        return setupDir(cname)
    })
    .then(()=>{
        return  genRootCA(cname)
    })
    .then(()=>{
        return genAdminKeyPair(cname)
    })
    .then( () => {
        return prepareClusterEnv(cname, cObj)
    })
    .then(()=>{

        async.eachSeries(nodes, (vname, cb)=>{ 
            VMs.findOne({
                where: { Name: vname, ClusterId: cObj.id}
            })
            .then((vm) => {
                if (vm.Type === 'etcd') {
                    startEtcd({cname, name: vname, cid: cObj.id}).then(()=>{
                        cb();
                    }, cb);
                }

                if (vm.Type === 'master') {
                    startMaster({cname, name: vname, cid: cObj.id, K8sIP: cObj.K8sIP}).then(()=>{
                        cb();
                    }, cb);
                }

                if (vm.Type === 'worker') {
                    startWorker({cname, name: vname, cid: cObj.id}).then(()=>{
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
    });
}

const vagrantHalt = ({cluster, nodes}) => {
    let cObj;
    let cname;

    return Clusters.findOne({
        where: { Name: cluster } 
    })
    .then( (cl) =>{ 
        cObj = cl;
        cname = cObj.Name;

        async.eachSeries(nodes, (vname, cb)=>{ 
            VMs.findOne({
                where: { Name: vname, ClusterId: cObj.id } ,
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
                execShellCmds(host, [`cd workdir/${cname}/${vm.Type}s/${vm.Name}`, `Vagrant halt`])
                .then(()=>(cb()),(ex)=>(cb(ex)));
            });
        }, (err)=>{
            if (err) {
                console.log(err)
            }
        });
    });

}

const vagrantDestroy = ({cluster, nodes}) => {
    let cObj;
    let cname;

    return Clusters.findOne({
        where: { Name: cluster } 
    })
    .then( (cl) =>{ 
        cObj = cl;
        cname = cObj.Name;
        return new Promise((resolve, reject)=>{        
            async.eachSeries(nodes, (vname, cb)=>{ 
                VMs.findOne({
                    where: { Name: vname, ClusterId: cObj.id },
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
                    execShellCmds(host, [`cd workdir/${cname}/${vm.Type}s/${vm.Name}`, `Vagrant halt`, `Vagrant destroy -f`])
                    .then(()=>(cb()),(ex)=>(cb(ex)));
                });
            }, (err)=>{
                if (err) {
                    console.log(err)
                    reject(err);
                    return err;
                }
                clearDir(cname).then(()=>(resolve('done')))
            });

        });
    });
}


var yaml = require('js-yaml');
import fs from 'fs';
const prepareClusterEnv = (cname, cls) => {
    return new Promise((resolve, reject) => {
        let output = `workdir/${cname}/options.env.yaml`
        const options = {
            K8S_VER: 'v1.5.2_coreos.0',
            HYPERKUBE_IMAGE_REPO: 'quay.io/coreos/hyperkube',
            POD_NETWORK: cls.PODNet,
            SERVICE_IP_RANGE: cls.ServiceNet,
            K8S_SERVICE_IP: cls.K8sIP,
            DNS_SERVICE_IP: cls.DNSIP,
            USE_CALICO: false
        }
        
        let contentYaml = yaml.safeDump(options)

        fs.mkdir(`workdir/${cname}`, (err)=>{
            fs.writeFile(output, contentYaml, (err) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                console.log("The options file was saved!");
                resolve();
            });
        });

        return cls;
    });

}

export { startVagrant, vagrantHalt, vagrantDestroy }