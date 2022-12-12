import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import crypto from "crypto";
import {
    ConnectClient,
    AssociatePhoneNumberContactFlowCommand,
    DisassociatePhoneNumberContactFlowCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

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
        const props = JSON.parse(event.ResourceProperties.PropString) as PhoneNumberContactFlowAssociationProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                /*  TODO
                    This should check that there isn't another phone number
                    already associated before associating. As of 2022-12-12
                    there is no API to get the current contact flow association
                    of a phone number.
                 */

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

                /*  TODO
                    This should check that this phone number is the one
                    associated before disassociating. As of 2022-12-12
                    there is no API to get the current contact flow association
                    of a phone number.
                 */

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
