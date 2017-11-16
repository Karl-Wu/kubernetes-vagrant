# -*- mode: ruby -*-
# # vi: set ft=ruby :

require 'fileutils'
require 'open-uri'
require 'tempfile'
require 'yaml'

Vagrant.require_version ">= 1.6.0"
$update_channel = "alpha"

load "setting.rb"

CONTROLLER_CLOUD_CONFIG_PATH = File.expand_path("./generic/controller-install.sh")
OPTIONS_PATH = File.expand_path("./options.env.yaml")

controllerIPs = $controllerIPs
etcd_endpoints = $etcd_endpoints

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

    config.vm.define vm_name = $vm_name do |controller|

        options = YAML.load(IO.readlines(OPTIONS_PATH)[1..-1].join)

        env_file = Tempfile.new('env_file', :binmode => true)
        options.map { |k, v| env_file.write("%s=%s\n"%[k, v]) }
        env_file.write("ETCD_ENDPOINTS=#{etcd_endpoints}\n")
        env_file.close

        controller.vm.hostname = vm_name

        ["vmware_fusion", "vmware_workstation"].each do |vmware|
            controller.vm.provider vmware do |v|
                v.vmx['memsize'] = $vm_memory
            end
        end

        controller.vm.provider :virtualbox do |vb|
            vb.memory = $vm_memory
        end

        controllerIP = $myIP
        #controller.vm.network :public_network, ip: controllerIP, bridge: "en0: Wi-Fi (AirPort)"   #make it public
        controller.vm.network :private_network, ip: controllerIP

        # Each controller gets the same cert
        #provisionMachineSSL(controller,"apiserver","kube-apiserver-#{controllerIP}",controllerIPs)
        #tarFile = "ssl/#{cn}.tar"
        tarFile = "ssl/kube-apiserver-#{controllerIP}.tar"
        controller.vm.provision :file, :source => tarFile, :destination => "/tmp/ssl.tar"
        controller.vm.provision :shell, :inline => "mkdir -p /etc/kubernetes/ssl && tar -C /etc/kubernetes/ssl -xf /tmp/ssl.tar", :privileged => true

        controller.vm.provision :file, :source => env_file, :destination => "/tmp/coreos-kube-options.env"
        controller.vm.provision :shell, :inline => "mkdir -p /run/coreos-kubernetes && mv /tmp/coreos-kube-options.env /run/coreos-kubernetes/options.env", :privileged => true

        controller.vm.provision :file, :source => CONTROLLER_CLOUD_CONFIG_PATH, :destination => "/tmp/vagrantfile-user-data"
        controller.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/", :privileged => true
    end

end
