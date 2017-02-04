import { Hosts, VMs } from '../db'
import sys from 'sys';
import { exec } from 'child_process'

const oDir = 'workdir/ssl'
const setupDir = ()=>{
    var child;
    child = exec(`mkdir -p ${oDir}`, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
            console.log('failed create dir: "${oDir}"')
            return error;
        }
        return null;
    });
}
setupDir()


//Generate root CA
const genRootCA = ()=>{
    var child;
    child = exec(`./lib/init-ssl-ca ${oDir}`, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
            console.log('failed generating SSL artifacts')
            return error;
        }
        return null;
    });
}

//Generate admin key/cert
const genAdminKeyPair = ()=>{
    var child;
    child = exec(`./lib/init-ssl ${oDir} admin kube-admin`, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
            console.log('failed generating admin SSL artifacts')
            return error;
        }
        return null;
    });
}


const genMachineSSL = (machine,certBaseName,cn,ipAddrs) => {
    let tarFile = `${oDir}/${cn}.tar`
    let ipString = ipAddrs.map((ip, i)=>{
        return `IP.${i+1}=${ip}`
    }).join(',')

    var child;
    child = exec(`./lib/init-ssl ${oDir} ${certBaseName} ${cn} ${ipString}`, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
        if (error !== null) {
            console.log('exec error: ' + error);
            console.log(`failed generating ${cn} SSL artifacts`)
            return error;
        }
        return null;
    });

}

module.exports = {genRootCA, genAdminKeyPair, genMachineSSL}