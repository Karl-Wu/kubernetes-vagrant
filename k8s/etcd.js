import { Hosts, VMs } from '../db'
import fs from 'fs';
import { execShellCmds, uploadFiles } from './ssh'

const subDir = 'etcds';

//get all etcd IPs, etcdIPs
const fetchEtcd = (name) => {
    return VMs.findAll({ 
            where: { Type: 'etcd' },
            include: {
                model: Hosts,
                as: 'Host',
            } 
        })
        .then((vms) => {
            var myInst;
            var etcdIPs;

            etcdIPs = vms.map((vm) => {
                if (vm.Name === name) {
                    myInst = vm;
                }
                return { Name: vm.Name, IP: vm.IP }
            })

            if (!myInst ) {
                throw new Error(`Can't find "${name}" in etcds`)
            }

            if (!myInst.Host) {
                throw new Error(`No host for "${name}"`)
            }

            let {Name, IP, Memory, Host} = myInst;
            let settings = {
                vm_name: Name,
                vm_memory: Memory || 512,
                myIP: IP,
                bridge: "en0: Wi-Fi (AirPort)",
                etcdIPs,
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
        let output = `workdir/${subDir}/${name}`
        let initial_etcd_cluster = settings.etcdIPs.map((etcd, i) => {
            return `${etcd.Name}=http://${etcd.IP}:2380`
        }).join(',');

        let content = `
$myIP = "${settings.myIP}"
$vm_memory = ${settings.vm_memory}
$vm_name = "${settings.vm_name}"
$bridge = "${settings.bridge}"
$initial_etcd_cluster = "${initial_etcd_cluster}"
`
        fs.mkdir(`workdir/${subDir}`, (err)=>{ 
            fs.writeFile(output, content, (err) => {
                if (err) {
                    return console.log(err);
                }

                console.log("The file was saved!");
            });
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
        return execShellCmds(mySettings.host, [`mkdir -p workdir/${subDir}/${name}`, 'ls workdir/${subDir}'])
    })
    .then(()=>{
        let files = [
            {
                from: `workdir/${subDir}/${name}`,
                to: `workdir/${subDir}/${name}/setting.rb`
            },
            {
                from: `files/etcd.tmpl.rb`,
                to: `workdir/${subDir}/${name}/Vagrantfile`
            },
            {
                from: `files/etcd-cloud-config.yaml`,
                to: `workdir/${subDir}/${name}/etcd-cloud-config.yaml`
            },
        ]
        return uploadFiles(mySettings.host, files)
    })
    .then(()=>{
        return execShellCmds(mySettings.host, [`cd workdir/${subDir}/${name}`, `Vagrant up`]);
    }).catch((ex)=>{
        console.log(ex);
    })
}

module.exports = { compileSettings, startVagrant }