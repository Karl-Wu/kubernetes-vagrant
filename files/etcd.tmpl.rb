require 'fileutils'
require 'open-uri'
require 'tempfile'
require 'yaml'

Vagrant.require_version ">= 1.6.0"

$update_channel = "alpha"

load "setting.rb"

ETCD_CLOUD_CONFIG_PATH = File.expand_path("etcd-cloud-config.yaml")

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

    config.vm.define vm_name = $vm_name do |etcd|

        data = YAML.load(IO.readlines(ETCD_CLOUD_CONFIG_PATH)[1..-1].join)
        data['coreos']['etcd2']['initial-cluster'] = $initial_etcd_cluster
        data['coreos']['etcd2']['name'] = vm_name
        etcd_config_file = Tempfile.new('etcd_config', :binmode => true)
        etcd_config_file.write("#cloud-config\n#{data.to_yaml}")
        etcd_config_file.close

        etcd.vm.hostname = vm_name

        ["vmware_fusion", "vmware_workstation"].each do |vmware|
        etcd.vm.provider vmware do |v|
            v.vmx['memsize'] = $vm_memory
        end
        end

        etcd.vm.provider :virtualbox do |vb|
            vb.memory = $vm_memory
        end

        #etcd.vm.network :public_network, ip: $myIP, bridge: $bridge     #make it public
        etcd.vm.network :private_network, ip: $myIP

        etcd.vm.provision :file, :source => etcd_config_file.path, :destination => "/tmp/vagrantfile-user-data"
        etcd.vm.provision :shell, :inline => "mv /tmp/vagrantfile-user-data /var/lib/coreos-vagrant/", :privileged => true
    end
end