import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import crypto from "crypto";
import {
    ConnectClient,
    DescribePhoneNumberCommand,
    AssociatePhoneNumberContactFlowCommand,
    DisassociatePhoneNumberContactFlowCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource} from "./provider";
import {ResourceType} from "./provider/types";

const connect = new ConnectClient({});

export interface PhoneNumberContactFlowAssociationProps {
    readonly connectInstanceId: string;
    readonly contactFlowId: string;
    readonly phoneNumberId: string;
}

export class ConnectPhoneNumberContactFlowAssociation extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: PhoneNumberContactFlowAssociationProps) {
        super(scope, id, props, ResourceType.PHONE_NUMBER_CONTACT_FLOW_ASSOCIATION);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = event.ResourceProperties as PhoneNumberContactFlowAssociationProps & { ServiceToken: string };
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                // TODO This command isn't right, TargetArn is the instance, not the flow
                // const describeCommand = new DescribePhoneNumberCommand({
                //     PhoneNumberId: props.phoneNumberId,
                // });
                // const response = await connect.send(describeCommand);
                //
                // const existingTarget = response.ClaimedPhoneNumberSummary!.TargetArn;
                //
                // if (existingTarget) {
                //     throw Error(`Phone number ${props.phoneNumberId} already has a target: "${existingTarget}"`);
                // }

                const command = new AssociatePhoneNumberContactFlowCommand({
                    InstanceId: props.connectInstanceId,
                    PhoneNumberId: props.phoneNumberId,
                    ContactFlowId: props.contactFlowId,
                });
                await connect.send(command);

                const propsHash = crypto.createHash('md5').update(JSON.stringify(props)).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                };
            }

            case "Delete": {

                // TODO This command isn't right, TargetArn is the instance, not the flow
                // const describeCommand = new DescribePhoneNumberCommand({
                //     PhoneNumberId: props.phoneNumberId,
                // });
                // const response = await connect.send(describeCommand);
                //
                // const existingTarget = response.ClaimedPhoneNumberSummary!.;
                //
                // if (!existingTarget || !existingTarget.includes(props.contactFlowId)) {
                //     return {
                //         ...event,
                //         Status: "SUCCESS",
                //     };
                // }

                const command = new DisassociatePhoneNumberContactFlowCommand({
                    InstanceId: props.connectInstanceId,
                    PhoneNumberId: props.phoneNumberId,
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
