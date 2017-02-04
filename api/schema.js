

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

type AddrUsed {
    id: String
    createdAt: String
    Address: String
    Owner: String
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
    
    VMs(id: String,Name: String,IP: String): [VM]

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
  
  createVM (
    Name: String!
    Type: String!
    Memory: Int
    IP: String!
  ): VM

  destroyVM (
    Name: String!
  ): String

  deployVM (
    Name: String!
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
    Who: String!
  ): AddrUsed

}

schema {
  query: Query
  mutation: Mutation
}
`;

export default [typeDefinitions];

