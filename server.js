import express from 'express';
import graphqlHTTP from 'express-graphql';
import bodyParser from 'body-parser';
import cors from 'cors';

import Resolvers from './api/resolvers';
import schemaTypes from './api/schema';

var { graphqlExpress, graphiqlExpress } = require('graphql-server-express');
var { makeExecutableSchema } = require('graphql-tools');

console.log(schemaTypes, Resolvers);
var schema = makeExecutableSchema({
    typeDefs:schemaTypes, 
    resolvers:Resolvers,
    printErrors: true,
});
var app = express();

app.use(cors());

app.use('/graphql', bodyParser.json(), graphqlExpress({schema}));
app.use('/graphiql', graphiqlExpress({endpointURL: '/graphql'}));
app.listen(3100, () => console.log('Now browse to localhost:3100/graphiql'));

