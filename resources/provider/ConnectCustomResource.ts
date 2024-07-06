import * as path from "path";
import * as CDK from 'aws-cdk-lib/core';
import * as IAM from 'aws-cdk-lib/aws-iam';
import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as NodeJSLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as CustomResource from 'aws-cdk-lib/custom-resources';
import {Construct} from 'constructs';

import {ResourceType} from "./types";

export abstract class ConnectCustomResource extends CDK.CustomResource {

    private static providersByStackId: Record<string, CustomResource.Provider> = {};

    protected constructor(
        scope: Construct,
        id: string,
        props: object, // Want to use Record<string, string>, but TypeScript won't let me. It should. I have { "noUncheckedIndexedAccess": true }.
        type: ResourceType,
    ) {
        super(scope, id, {
            serviceToken: ConnectCustomResource.getProvider(CDK.Stack.of(scope)).serviceToken,
            properties: { PropString: JSON.stringify(props) },
            resourceType: `Custom::${type}`,
        });
    }

    private static getProvider(stack: CDK.Stack): CustomResource.Provider {

        const existingProvider = ConnectCustomResource.providersByStackId[stack.stackId];

        if (existingProvider) {
            return existingProvider;
        }

        const lambda = new NodeJSLambda.NodejsFunction(stack, "ConnectCustomResourceLambda", {
            entry: path.resolve(__dirname, './ConnectCustomResourceHandler.js'),
            handler: 'handler',
            runtime: Lambda.Runtime.NODEJS_18_X,
            timeout: CDK.Duration.minutes(5),
        });

        lambda.addToRolePolicy(new IAM.PolicyStatement({
            actions: [
                "connect:Associate*",
                "connect:Describe*",
                "connect:Disassociate*",
                "connect:List*",
                "connect:*Queue*",
                "connect:*SecurityProfile*",
                "connect:*RoutingProfile*",
                "connect:*AgentStatus*",
                "connect:*TrafficDistributionGroup*",

                "ds:DescribeDirectories",

                "iam:*RolePolicy",
                "iam:CreateServiceLinkedRole",

                "lambda:*Permission",

                "lex:*ResourcePolicy",
                "lex:DescribeBotAlias",
                "lex:GetBot",
            ],
            resources: ["*"],
        }));

        const newProvider = new CustomResource.Provider(stack, `ConnectCustomResourceProvider`, {
            onEventHandler: lambda,
        });

        ConnectCustomResource.providersByStackId[stack.stackId] = newProvider;
        return newProvider;

    }

}
