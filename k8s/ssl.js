import { Hosts, VMs } from '../db'
import sys from 'sys';
import { exec } from 'child_process'

const setupDir = (cname) => {
    var child;
    return new Promise((resolve, reject) => {
        child = exec(`mkdir -p workdir/${cname}/ssl`, function (error, stdout, stderr) {
            console.log(`mkdir -p workdir/${cname}/ssl`)
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                console.log('failed create dir: "workdir/${cname}/ssl"')
                return reject(error);
            }
            return resolve();
        });
    });
}

const clearDir = (cname) => {
    var child;
    return new Promise((resolve, reject) => {
        child = exec(`rm -rf workdir/${cname}`, function (error, stdout, stderr) {
            console.log(`rm -rf workdir/${cname}`)
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
                console.log('failed rm dir: "workdir/${cname}/ssl"')
                return reject(error);
            }
            return resolve();
        });
    });
}


//Generate root CA
const genRootCA = (cname)=>{
    var child;
    return new Promise((resolve, reject) => {
        child = exec(`./lib/init-ssl-ca workdir/${cname}/ssl`, function (error, stdout, stderr) {
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
const genAdminKeyPair = (cname)=>{
    var child;
    return new Promise((resolve, reject) => {
        child = exec(`./lib/init-ssl workdir/${cname}/ssl admin kube-admin`, function (error, stdout, stderr) {
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


const genMachineSSL = (cname, certBaseName,cn, ipAddrs) => {
    let tarFile = `workdir/${cname}/ssl/${cn}.tar`
    let ipString = ipAddrs.map((ip, i)=>{
        return `IP.${i+1}=${ip}`
    }).join(',')

    let child;
    return new Promise((resolve, reject) => {
        child = exec(`./lib/init-ssl workdir/${cname}/ssl ${certBaseName} ${cn} ${ipString}`, function (error, stdout, stderr) {
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

module.exports = {genRootCA, genAdminKeyPair, genMachineSSL, clearDir, setupDir}