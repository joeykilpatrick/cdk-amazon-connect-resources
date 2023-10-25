import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import {
    ConnectClient,
    paginateListPhoneNumbers,
    PhoneNumberSummary,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface ExistingPhoneNumberProps {
    readonly connectInstanceId: string;
    readonly phoneNumber: string;
}

export class ConnectExistingPhoneNumber extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ExistingPhoneNumberProps) {
        super(scope, id, props, ResourceType.EXISTING_PHONE_NUMBER);
    }

    get attrId(): string {
        return this.getAttString('PhoneNumberId');
    }

    get attrArn(): string {
        return this.getAttString('PhoneNumberArn');
    }

    get attrPhoneNumber(): string {
        return this.getAttString('PhoneNumber');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as ExistingPhoneNumberProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const phoneNumbers: PhoneNumberSummary[] = [];
                for await (const page of paginateListPhoneNumbers({client: connect}, {
                    InstanceId: props.connectInstanceId,
                })) {
                    phoneNumbers.push(...page.PhoneNumberSummaryList!);
                }

                const phoneNumber = phoneNumbers.find(
                    (phoneNumber) => phoneNumber.PhoneNumber === props.phoneNumber
                );

                if (!phoneNumber) {
                    throw Error(`Phone Number "${props.phoneNumber}" does not exist on Connect instance ${props.connectInstanceId}.`);
                }

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: Date.now().toString(),
                    Data: {
                        PhoneNumberId: phoneNumber.Id,
                        PhoneNumberArn: phoneNumber.Arn,
                        PhoneNumber: phoneNumber.PhoneNumber,
                    }
                };

            }

            case "Delete": {

                return {
                    ...event,
                    Status: "SUCCESS",
                };

            }

        }
    }

}
