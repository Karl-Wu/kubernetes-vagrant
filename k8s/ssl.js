import { Hosts, VMs } from '../db'
import sys from 'sys';
import { exec } from 'child_process'

const oDir = 'workdir/ssl'
const setupDir = () => {
    var child;
    return new Promise((resolve, reject) => {
        child = exec(`mkdir -p ${oDir}`, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                console.log('failed create dir: "${oDir}"')
                return reject(error);
            }
            return resolve();
        });
    });
}
setupDir()


//Generate root CA
const genRootCA = ()=>{
    var child;
    return new Promise((resolve, reject) => {
        child = exec(`./lib/init-ssl-ca ${oDir}`, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                console.log('failed generating SSL artifacts')
                return reject(error);
            }
            return resolve();
        });
    });
}

//Generate admin key/cert
const genAdminKeyPair = ()=>{
    var child;
    return new Promise((resolve, reject) => {
        child = exec(`./lib/init-ssl ${oDir} admin kube-admin`, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                console.log('failed generating admin SSL artifacts')
                return reject(error);
            }
            return resolve();
        });
    });
}


const genMachineSSL = (certBaseName,cn,ipAddrs) => {
    let tarFile = `${oDir}/${cn}.tar`
    let ipString = ipAddrs.map((ip, i)=>{
        return `IP.${i+1}=${ip}`
    }).join(',')

    let child;
    return new Promise((resolve, reject) => {
        child = exec(`./lib/init-ssl ${oDir} ${certBaseName} ${cn} ${ipString}`, function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                console.log(`failed generating ${cn} SSL artifacts`)
                return reject(error);
            }
            return resolve();
        });
    });
}

module.exports = {genRootCA, genAdminKeyPair, genMachineSSL}