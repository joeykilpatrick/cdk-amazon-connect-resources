import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    ListLambdaFunctionsCommand,
    AssociateLambdaFunctionCommand,
    DisassociateLambdaFunctionCommand,
    ConnectClient,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource} from "./provider";
import {ResourceType} from "./provider/types";

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
        const props = event.ResourceProperties as LambdaFunctionAssociationProps & { ServiceToken: string };
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const listCommand = new ListLambdaFunctionsCommand({
                    InstanceId: props.connectInstanceId,
                });
                const response = await connect.send(listCommand);

                const existsAlready = response.LambdaFunctions!.some(
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

                const listCommand = new ListLambdaFunctionsCommand({
                    InstanceId: props.connectInstanceId,
                });
                const response = await connect.send(listCommand);

                const exists = response.LambdaFunctions!.some(
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
