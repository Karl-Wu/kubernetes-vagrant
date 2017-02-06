# -*- mode: ruby -*-
# # vi: set ft=ruby :

require 'fileutils'
require 'open-uri'
require 'tempfile'
require 'yaml'

Vagrant.require_version ">= 1.6.0"
$update_channel = "alpha"

worker_CLUSTER_IP="10.3.0.1"  # ???

load "setting.rb"

WORKER_CLOUD_CONFIG_PATH = File.expand_path("./generic/worker-install.sh")

controllerIP = $controllerIPs[0] # LB or DNS across control nodes

etcd_endpoints = $etcd_endpoints

if $vm_memory < 1024
  puts "Workers should have at least 1024 MB of memory"
end

Vagrant.configure("2") do |config|
    # always use Vagrant's insecure key
    config.ssh.insert_key = false

    config.vm.box = "coreos-%s" % $update_channel
    config.vm.box_version = ">= 1151.0.0"
    config.vm.box_url = "http://%s.release.core-os.net/amd64-usr/current/coreos_production_vagrant.json" % $update_channel

    ["vmware_fusion", "vmware_workstation"].each do |vmware|
        config.vm.provider vmware do |v, override|
        override.vm.box_url = "http://%s.release.core-os.net/amd64-usr/current/coreos_production_vagrant_vmware_fusion.json" % $update_channel
        end
    end

    config.vm.provider :virtualbox do |v|
        # On VirtualBox, we don't have guest additions or a functional vboxsf
        # in CoreOS, so tell Vagrant that so it can be smarter.
        v.check_guest_additions = false
        v.functional_vboxsf     = false
    end

    # plugin conflict
    if Vagrant.has_plugin?("vagrant-vbguest") then
        config.vbguest.auto_update = false
    end

    ["vmware_fusion", "vmware_workstation"].each do |vmware|
        config.vm.provider vmware do |v|
        v.vmx['numvcpus'] = 1
        v.gui = false
        end
    end

    config.vm.provider :virtualbox do |vb|
        vb.cpus = 1
        vb.gui = false
    end

    config.vm.define vm_name = $vm_name do |worker|

        env_file = Tempfile.new('env_file', :binmode => true)
        env_file.write("ETCD_ENDPOINTS=#{etcd_endpoints}\n")
        env_file.write("CONTROLLER_ENDPOINT=https://#{controllerIP}\n") #TODO(aaron): LB or DNS across control nodes
        env_file.close

        worker.vm.hostname = vm_name

        ["vmware_fusion", "vmware_workstation"].each do |vmware|
            worker.vm.provider vmware do |v|
                v.vmx['memsize'] = $vm_memory
            end
        end

        worker.vm.provider :virtualbox do |vb|
            vb.memory = $vm_memory
        end

        workerIP = $myIP
        #worker.vm.network :public_network, ip: workerIP, bridge: "en0: Wi-Fi (AirPort)"   #make it public
        worker.vm.network :private_network, ip: workerIP

        #provisionMachineSSL(worker,"worker","kube-worker-#{workerIP}",[workerIP])
        #tarFile = "ssl/#{cn}.tar"
        tarFile = "ssl/kube-worker-#{workerIP}.tar"
        worker.vm.provision :file, :source => tarFile, :destination => "/tmp/ssl.tar"
        worker.vm.provision :shell, :inline => "mkdir -p /etc/kubernetes/ssl && tar -C /etc/kubernetes/ssl -xf /tmp/ssl.tar", :privileged => true

        worker.vm.provision :file, :source => env_file, :destination => "/tmp/coreos-kube-options.env"
        worker.vm.provision :shell, :inline => "mkdir -p /run/coreos-kubernetes && mv /tmp/coreos-kube-options.env /run/coreos-kubernetes/options.env", :privileged => true

        worker.vm.provision :file, :source => WORKER_CLOUD_CONFIG_PATH, :destination => "/tmp/vagrantfile-user-data"
        worker.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/", :privileged => true
    end

end
