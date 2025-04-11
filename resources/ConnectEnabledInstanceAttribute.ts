import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "node:crypto";
import {
    ConnectClient,
    ListInstanceAttributesCommand,
    UpdateInstanceAttributeCommand,
    UpdateInstanceAttributeRequest,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

type CreateEnabledInstanceAttributeProps = Omit<UpdateInstanceAttributeRequest, 'Value' | 'ClientToken'>;

export class ConnectEnabledInstanceAttribute extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: CreateEnabledInstanceAttributeProps) {
        super(scope, id, props, ResourceType.ENABLED_INSTANCE_ATTRIBUTE);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as CreateEnabledInstanceAttributeProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const listCommand = new ListInstanceAttributesCommand({
                    InstanceId: props.InstanceId,
                });
                const listAttributesResponse = await connect.send(listCommand);

                const existingAttribute = listAttributesResponse.Attributes!.find((attribute) => attribute.AttributeType === props.AttributeType)!;

                if (existingAttribute.Value === 'true') {
                    throw Error(`Instance attribute type "${props.AttributeType}" is already enabled on Connect instance ${props.InstanceId}.`);
                }

                const enableCommand = new UpdateInstanceAttributeCommand({
                    ...props,
                    Value: 'true',
                });
                await connect.send(enableCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify(props)).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                };

            }

            case "Delete": {

                const disableCommand = new UpdateInstanceAttributeCommand({
                    ...props,
                    Value: 'false',
                });
                await connect.send(disableCommand);

                return {
                    ...event,
                    Status: "SUCCESS",
                };

            }

        }

    }

}
