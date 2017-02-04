import { Hosts, VMs } from '../db'
import fs from 'fs';
import { execShellCmds, uploadFiles } from './ssh'


const fetchMaster = (name) => {
    return VMs.findAll({ 
            where: { Type: {$in:['master', 'etcd']} },
            include: {
                model: Hosts,
                as: 'Host',
            } 
        })
        .then((vms) => {
            var myInst;
            let etcdIPs = [];
            let controllerIPs = [];

            vms.map((vm) => {
                if (vm.Name === name && vm.Type === 'master') {
                    myInst = vm;
                }
                if (vm.Type === 'master') {
                    controllerIPs.push({ Name: vm.Name, IP: vm.IP });
                }
                if (vm.Type === 'etcd') {
                    etcdIPs.push({ Name: vm.Name, IP: vm.IP });
                }
            })

            if (myInst.ClusterIP) {
                controllerIPs.push(myInst.ClusterIP);
            }

            if (!myInst ) {
                throw new Error(`Can't find "${name}" in masters/controllers`)
            }

            let {Name, IP, Memory, Host, ClusterIP} = myInst;
            let settings = {
                vm_name: Name,
                vm_memory: Memory || 512,
                myIP: IP,
                bridge: "en0: Wi-Fi (AirPort)",
                etcdIPs,
                ClusterIP,
                controllerIPs,
                host:{
                    ip: Host.IP,
                    host: Host.IP, //Host.Host,
                    user: Host.User,
                    workdir: Host.Workdir,
                    netif: Host.Netif,
                    pass: 'Windows.'
                }
            };

            return settings;
        });
}


const compileSettings = (name) => {
    return fetchEtcd(name).then((settings) => {
        console.log(settings);
        let output = `workdir/masters/${name}`
        let etcd_endpoints = settings.etcdIPs.map((etcd, i) => {
            return `http://${etcd.IP}:2380`
        }).join(',');
        
        let controllerIPs = settings.controllerIPs.map((ctrl, i) => {
            return ctrl.IP
        }).join(',');

        let content = `
$myIP = "${settings.myIP}"
$vm_memory = ${settings.vm_memory}
$vm_name = "${settings.vm_name}"
$bridge = "${settings.bridge}"
$etcd_endpoints = "${etcd_endpoints}"
$controllerIPs = "${controllerIPs}"
`
        fs.writeFile(output, content, (err) => {
            if (err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });

        return settings;
    })
    .catch((ex) => {
        console.log(ex)
    })
}

const startVagrant = (name) => {
    var mySettings;
    //create the setting file
    return compileSettings(name)
    .then((settings)=>{
        mySettings = settings;
        return execShellCmds(mySettings.host, [`mkdir -p workdir/etcds/${name}`, 'ls workdir/etcds'])
    })
    .then(()=>{
        let files = [
            {
                from: `workdir/etcds/${name}`,
                to: `workdir/etcds/${name}/setting.rb`
            },
            {
                from: `workdir/files/etcd.tmpl.rb`,
                to: `workdir/etcds/${name}/Vagrantfile`
            },
            {
                from: `workdir/files/etcd-cloud-config.yaml`,
                to: `workdir/etcds/${name}/etcd-cloud-config.yaml`
            },
        ]
        return uploadFiles(mySettings.host, files)
    })
    .then(()=>{
        return execShellCmds(mySettings.host, [`cd workdir/etcds/${name}`, `Vagrant up`]);
    }).catch((ex)=>{
        console.log(ex);
    })
}

module.exports = { compileSettings, startVagrant }