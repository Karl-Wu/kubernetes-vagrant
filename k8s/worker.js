import { Hosts, VMs } from '../db'
import fs from 'fs';
import { execShellCmds, uploadFiles } from './ssh'
import { genMachineSSL } from './ssl'

const subDir = 'workers';
const destDir = (cname, name) => {
    return `workdir/${cname}/${subDir}/${name}`
}

const fetchDb = ({cname, name, cid}) => {
    return VMs.findAll({
        where: { ClusterId: cid },
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
            if (vm.Name === name && vm.Type === 'worker') {
                myInst = vm;
            }
            if (vm.Type === 'master') {
                controllerIPs.push({ Name: vm.Name, IP: vm.IP });
            }
            if (vm.Type === 'etcd') {
                etcdIPs.push({ Name: vm.Name, IP: vm.IP });
            }
        })

        if (!myInst) {
            throw new Error(`Can't find "${name}" in workers`)
        }

        if (!myInst.Host) {
            throw new Error(`No host for "${name}"`)
        }

        if (myInst.ClusterIP) {
            controllerIPs.push(myInst.ClusterIP);
        }

        let {Name, IP, Memory, Host, ClusterIP} = myInst;
        let settings = {
            vm_name: Name,
            vm_memory: Memory || 1024,
            myIP: IP,
            bridge: "en0: Wi-Fi (AirPort)",
            etcdIPs,
            ClusterIP,
            controllerIPs,
            host: {
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


const compileSettings = (cname, settings) => {
    return new Promise((resolve, reject) => {
        console.log(settings);
        let output = `workdir/${cname}/setting.${settings.vm_name}`
        let etcd_endpoints = settings.etcdIPs.map((etcd, i) => {
            return `http://${etcd.IP}:2379`
        }).join(',');

        let controllerIPs = settings.controllerIPs.map((ctrl, i) => {
            return ctrl.IP
        })

        let content = `
$myIP = "${settings.myIP}"
$vm_memory = ${settings.vm_memory}
$vm_name = "${settings.vm_name}"
$bridge = "${settings.bridge}"
$etcd_endpoints = "${etcd_endpoints}"
$controllerIPs = ${JSON.stringify(controllerIPs)}
`
        fs.mkdir(`workdir/${cname}`, (err)=>{
            fs.writeFile(output, content, (err) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                console.log("The file was saved!");
                resolve();
            });
        });
        

        return settings;
    });
}

const startVagrant = ({cname, name, cid}) => {
    var mySettings;
    //create the setting file
    return fetchDb({cname, name, cid})
        .then((settings) => {
            mySettings = settings;
            return compileSettings(cname, mySettings)
        })
        .then((settings) => {
            let controllerIPs = mySettings.controllerIPs.map((ctrl, i) => {
                return ctrl.IP
            });
            return genMachineSSL(cname, "worker", `kube-worker-${mySettings.myIP}`, [mySettings.myIP])
        })
        .then(() => {
            return execShellCmds(mySettings.host, 
            [`mkdir -p ${destDir(cname, name)}`, `mkdir -p ${destDir(cname, name)}/generic`, 
            `mkdir -p ${destDir(cname, name)}/ssl`, `ls ${destDir(cname, name)}`])
        })
        .then(() => {
            let files = [
                {
                    from: `workdir/${cname}/setting.${mySettings.vm_name}`,
                    to: `${destDir(cname, name)}/setting.rb`
                },
                {
                    from: `workdir/${cname}/options.env.yaml`,
                    to: `${destDir(cname, name)}/options.env.yaml`
                },
                {
                    from: `files/worker.tmpl.rb`,
                    to: `${destDir(cname, name)}/Vagrantfile`
                },
                {
                    from: `files/worker-install.sh`,
                    to: `${destDir(cname, name)}/generic/worker-install.sh`
                },
                {
                    from: `workdir/${cname}/ssl/kube-worker-${mySettings.myIP}.tar`,
                    to: `${destDir(cname, name)}/ssl/kube-worker-${mySettings.myIP}.tar`
                },
            ]
            return uploadFiles(mySettings.host, files)
        })
        .then(() => {
            return execShellCmds(mySettings.host, [`cd ${destDir(cname, name)}`, `Vagrant up`]);
        }).catch((ex) => {
            console.log(ex);
        })
}

export { startVagrant }