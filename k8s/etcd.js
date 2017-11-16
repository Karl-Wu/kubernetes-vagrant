import { Hosts, VMs } from '../db'
import fs from 'fs';
import { execShellCmds, uploadFiles } from './ssh'

const subDir = 'etcds';

const destDir = (cname, name) => {
    return `workdir/${cname}/${subDir}/${name}`
}
//get all etcd IPs, etcdIPs
const fetchEtcd = ({cname, name, cid}) => {
    return VMs.findAll({ 
            where: { Type: 'etcd', ClusterId: cid },
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


const compileSettings = ({cname, name, cid}) => {
    return fetchEtcd({cname, name, cid}).then((settings) => {
        console.log(settings);
        let output = `workdir/${cname}/setting.${settings.vm_name}`
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
        fs.mkdir(`workdir/${cname}/`, (err)=>{ 
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

const startVagrant = ({cname, name, cid}) => {
    var mySettings;
    //create the setting file
    return compileSettings({cname, name, cid})
    .then((settings)=>{
        mySettings = settings;
        return execShellCmds(mySettings.host, [`mkdir -p ${destDir(cname, name)}`, `ls ${destDir(cname, name)}`])
    })
    .then(()=>{
        let files = [
            {
                from: `workdir/${cname}/setting.${mySettings.vm_name}`,
                to: `${destDir(cname, name)}/setting.rb`
            },
            {
                from: `files/etcd.tmpl.rb`,
                to: `${destDir(cname, name)}/Vagrantfile`
            },
            {
                from: `files/etcd-cloud-config.yaml`,
                to: `${destDir(cname, name)}/etcd-cloud-config.yaml`
            },
        ]
        return uploadFiles(mySettings.host, files)
    })
    .then(()=>{
        return execShellCmds(mySettings.host, [`cd ${destDir(cname, name)}`, `Vagrant up`]);
    }).catch((ex)=>{
        console.log(ex);
    })
}

module.exports = { compileSettings, startVagrant }