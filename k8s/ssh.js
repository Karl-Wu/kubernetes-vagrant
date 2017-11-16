const async = require('async');
import fs from 'fs';
import { Client as sshClient } from 'ssh2';

var Promise = require("bluebird");

const uploadFiles = (host, files) => {
    return new Promise((resolve, reject) => {
        let conn = new sshClient();
        let connSettings = {
            host: host.host,
            port: host.port || 22, 
            username: host.user,
            //password: host.pass
            tryKeyboard: true // this attempts keyboard-interactive auth
        }

        conn.on('keyboard-interactive',
            function(name, instructions, instructionsLang, prompts, finish) {
            // Pass answers to `prompts` to `finish()`. Typically `prompts.length === 1`
            // with `prompts[0] === "Password: "`
            finish([host.pass]);
        })

        conn.on('ready', function() {
            conn.sftp(function(err, sftp) {
                if (err) {
                    throw err;
                    return reject(err);
                }
            
                const copy = (sftp, from, to, cb) => {
                    var readStream = fs.createReadStream(from);
                    var writeStream = sftp.createWriteStream(to);
                
                    writeStream.on('close',function () {
                        console.log( "- file transferred succesfully" );
                        return cb(null, "- file transferred succesfully");
                    });

                    conn.on('error', (err) => {
                        console.log( "- connection error(in): %s", err );
                        return cb(err);
                    });
                    // initiate transfer of file
                    readStream.pipe( writeStream );
                }

                async.eachSeries(files, (item, cb) =>{ 
                    copy(sftp, item.from, item.to, cb);
                }, (err)=>{
                    if (err) {
                        console.log(err)
                        return reject(err);
                    }
                    conn.end();
                });
                
            });
        })
        
        
        conn.on('error', (err) => {
            console.log( "- connection error: %s", err );
            reject(err);
        }); 
        
        conn.on( 'end',() => {
            console.log( "- connection ended");
            resolve();
        });

        conn.connect(connSettings);
    });
}

const execShellCmds = (host, cmds) => {
    return new Promise((resolve, reject) => {
        let conn = new sshClient();
    
        let connSettings = {
            host: host.host,
            port: host.port || 22, 
            username: host.user,
            //password: host.pass, //https://github.com/mscdex/ssh2/issues/238
            tryKeyboard: true // this attempts keyboard-interactive auth
        }
        
        conn.on('keyboard-interactive',
            function(name, instructions, instructionsLang, prompts, finish) {
            // Pass answers to `prompts` to `finish()`. Typically `prompts.length === 1`
            // with `prompts[0] === "Password: "`
            console.log(name, instructions, instructionsLang, prompts, finish);
            finish([host.pass]);
        })

        conn.on('ready', function() {
            conn.shell(function(err, stream) {
                if (err) {
                    //throw err;
                    return reject(err);
                }
                
                stream.on('close', function() {
                    console.log('Stream :: close');
                    conn.end();
                }).on('data', function(data) {
                    console.log('STDOUT: ' + data);
                }).stderr.on('data', function(data) {
                    console.log('STDERR: ' + data);
                });
            
                var str = cmds.join('\n') + '\nexit\n'
                stream.end( str );
            });
        })
        
        
        conn.on('error', (err) => {
            console.log( "- connection error: %s", err );
            reject(err);
        }); 
        
        conn.on( 'end',() => {
            console.log( "- connection ended");
            resolve('end');
        });

        conn.connect(connSettings);
    });
}

module.exports = { uploadFiles, execShellCmds }