import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    AssociateLambdaFunctionCommand,
    ConnectClient,
    DisassociateLambdaFunctionCommand,
    paginateListLambdaFunctions
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface LambdaFunctionAssociationProps {
    readonly connectInstanceId: string;
    readonly functionArn: string;
}

export class ConnectLambdaFunctionAssociation extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: LambdaFunctionAssociationProps) {
        super(scope, id, props, ResourceType.LAMBDA_FUNCTION_ASSOCIATION);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as LambdaFunctionAssociationProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const lambdas: string[] = [];
                for await (const page of paginateListLambdaFunctions({client: connect}, {
                    InstanceId: props.connectInstanceId,
                })) {
                    lambdas.push(...page.LambdaFunctions!);
                }

                const existsAlready = lambdas.some(
                    (arn) => arn === props.functionArn
                );

                if (existsAlready) {
                    throw Error(`Lambda ${props.functionArn} is already associated to Connect instance ${props.connectInstanceId}.`);
                }

                const associateCommand = new AssociateLambdaFunctionCommand({
                    InstanceId: props.connectInstanceId,
                    FunctionArn: props.functionArn,
                });
                await connect.send(associateCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify(props)).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                };
            }

            case "Delete": {

                const lambdas: string[] = [];
                for await (const page of paginateListLambdaFunctions({client: connect}, {
                    InstanceId: props.connectInstanceId,
                })) {
                    lambdas.push(...page.LambdaFunctions!);
                }

                const exists = lambdas.some(
                    (arn) => arn === props.functionArn
                );

                if (!exists) {
                    return {
                        ...event,
                        Status: "SUCCESS",
                    };
                }

                const command = new DisassociateLambdaFunctionCommand({
                    InstanceId: props.connectInstanceId,
                    FunctionArn: props.functionArn,
                });
                await connect.send(command);

                return {
                    ...event,
                    Status: "SUCCESS",
                };

            }

        }
    }

}
