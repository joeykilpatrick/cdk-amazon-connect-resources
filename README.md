# Amazon Connect Resources for AWS CDK

![Experimental](https://img.shields.io/badge/experimental-important.svg?style=for-the-badge)
[![npm](https://img.shields.io/npm/v/cdk-amazon-connect-resources)](https://www.npmjs.com/package/cdk-amazon-connect-resources)

An AWS Cloud Development Kit (AWS CDK) construct library that provides custom resources for Amazon Connect where CloudFormation support is currently not available.

An example project can be found [here](https://github.com/joeykilpatrick/cdk-amazon-connect).

## Installing
```shell
npm i cdk-amazon-connect-resources
```

## Constructs
Level 1 Constructs:
- `ConnectAgentStatus`
- `ConnectExistingInstance`
- `ConnectExistingPhoneNumber`
- `ConnectExistingPrompt`
- `ConnectExistingTrafficDistributionGroup`
- `ConnectPhoneNumberContactFlowAssociation`

Level 2 constructs:
- `ConnectFlowPhoneNumber`
- `ConnectLambdaFunction`

Deprecated constructs:
- `ConnectLambdaFunctionAssociation` (Use `AWS::Connect::IntegrationAssociation`, added Feb. 2023)
- `ConnectLexBotAssociation` (Use `AWS::Connect::IntegrationAssociation`, added Feb. 2023)
- `ConnectQueue` (Use `AWS::Connect::Queue`, added July 2023)
- `ConnectRoutingProfile` (Use `AWS::Connect::RoutingProfile`, added July 2023)
- `ConnectSecurityProfile` (Use `AWS::Connect::SecurityProfile`, added Sep. 2023)
