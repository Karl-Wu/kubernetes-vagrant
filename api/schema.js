

const typeDefinitions = `
type Host {
    id: String,
    Host: String
    IP: String
    Status: String
}

type VM {
    id: String
    Name: String
    Type: String
    Memory: Int
    IP: String
    Host: Host 
}

type AddressOwner {
    Cluster: String
    Name: String
    Type: String
}

input AddressOwnerInput {
    Cluster: String
    Name: String
    Type: String
}

type Cluster {
    id: String
    Name: String
    PODNet: String
    ServiceNet: String
    K8sIP: String
    DNSIP: String
    Nodes: [VM]
}

type AddrUsed {
    id: String
    createdAt: String
    Address: String
    Owner: AddressOwner
}

type IPv4Pool {
    id: String
    Name: String
    Network: String
    PrefixLen: Int
    StartIP: String
    EndIP: String
    AddrUseds: [AddrUsed]
}

type Query {
    hosts(Host: String, IP: String): [Host]
    
    VMs(clusterId: String!, id: String, Name: String, IP: String): [VM]

    Clusters(id: String, Name: String):[Cluster]

    IPv4Pools(id: String,Name: String): [IPv4Pool]

    TestEntry(name: String): String
}

type Mutation {
  createHost (
    Host: String!
    IP: String!
    User: String!
    Status: String
  ): Host
  
  upsertHost (
    id: String!
    Host: String
    IP: String
    User: String
    Status: String
  ): Host

  upsertCluster(
    id: String
    Name: String
    PODNet: String
    ServiceNet: String
    K8sIP: String
    DNSIP: String
  ): Cluster

  destroyCluster(
    id: String
    Name: String
  ): String

  upsertVM (
    ClusterId: String!
    Name: String!
    Type: String!
    Memory: Int
    IP: String!
    HostId: String
  ): VM

  destroyVM (
    id: String!
  ): String

  deployVM (
    id: String!
    Host: String!
  ): String

  bringupVM (
    Name: String!
  ): String

  shutdownVM (
    Name: String!
  ): String

  createIPv4Pool(
    Name: String!
    Network: String!
    PrefixLen: Int
    StartIP: String
    EndIP: String
  ): IPv4Pool

  deleteIPv4Pool(
    Name: String!
  ): String

  allocIP(
    Name: String!
    Who: AddressOwnerInput
  ): AddrUsed

  releaseIP(
    Name: String!
    Address: String!
  ): String

  vagrantUP(
    cluster:String!
    nodes: [String]
  ): String

  vagrantHalt(
    cluster:String!
    nodes: [String]
  ): String

  vagrantDestroy(
    cluster:String!
    nodes: [String]
  ): String
}

schema {
  query: Query
  mutation: Mutation
}
`;

export default [typeDefinitions];

