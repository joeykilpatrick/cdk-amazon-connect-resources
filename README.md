# Amazon Connect Resources for AWS CDK
---

![Experimental](https://img.shields.io/badge/experimental-important.svg?style=for-the-badge)
[![npm](https://img.shields.io/npm/v/cdk-amazon-connect-resources)](https://www.npmjs.com/package/cdk-amazon-connect-resources)

An AWS Cloud Development Kit (AWS CDK) construct library that provides custom resources for Amazon Connect where CloudFormation support is currently not available.

An example project can be found [here](https://github.com/joeykilpatrick/cdk-amazon-connect).

## Installing
```shell
npm i cdk-amazon-connect-resources
```

## Constructs
Custom CDK resources:
- `ConnectExistingPrompt`
- `ConnectLambdaFunctionAssociation`
- `ConnectLexBotAssociation`
- `ConnectPhoneNumberContactFlowAssociation`
- `ConnectQueue`
- `ConnectRoutingProfile`
- `ConnectSecurityProfile`

Higher-level CDK constructs:
- `ConnectFlowPhoneNumber`
- `ConnectLambdaFunction`