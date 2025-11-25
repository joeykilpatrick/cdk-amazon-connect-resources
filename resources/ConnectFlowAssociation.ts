import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    AssociateFlowCommand,
    ConnectClient,
    DisassociateFlowCommand,
    FlowAssociationResourceType,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface FlowAssociationProps {
    readonly connectInstanceId: string;
    readonly flowId: string;
    readonly resourceId: string;
    readonly resourceType: FlowAssociationResourceType;
}

export class ConnectFlowAssociation extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: FlowAssociationProps) {
        super(scope, id, props, ResourceType.FLOW_ASSOCIATION);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as FlowAssociationProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const associateCommand = new AssociateFlowCommand({
                    FlowId: props.flowId,
                    InstanceId: props.connectInstanceId,
                    ResourceType: props.resourceType,
                    ResourceId: props.resourceId,
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

                const command = new DisassociateFlowCommand({
                    InstanceId: props.connectInstanceId,
                    ResourceType: props.resourceType,
                    ResourceId: props.resourceId,
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
