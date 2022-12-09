import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    ConnectClient,
    CreateSecurityProfileCommand,
    CreateSecurityProfileRequest,
    DeleteSecurityProfileCommand,
    ListSecurityProfilesCommand,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

interface ConnectSecurityProfileProps extends CreateSecurityProfileRequest {
    InstanceId: string,
    SecurityProfileName: string,
}

export class ConnectSecurityProfile extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ConnectSecurityProfileProps) {
        super(scope, id, props, ResourceType.SECURITY_PROFILE);
    }

    get attrId(): string {
        return this.getAttString('SecurityProfileId');
    }

    get attrArn(): string {
        return this.getAttString('SecurityProfileArn');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as ConnectSecurityProfileProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const listCommand = new ListSecurityProfilesCommand({ // TODO Multiple pages
                    InstanceId: props.InstanceId,
                });
                const listCommandResponse = await connect.send(listCommand);

                const existsAlready = listCommandResponse.SecurityProfileSummaryList!.some(
                    (name) => name === props.SecurityProfileName,
                );

                if (existsAlready) {
                    throw Error(`Security Profile "${props.SecurityProfileName}" already exists on Connect instance ${props.InstanceId}.`);
                }

                const createCommand = new CreateSecurityProfileCommand(props);
                const createCommandResponse = await connect.send(createCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify({
                    InstanceId: props.InstanceId,
                    SecurityProfileName: props.SecurityProfileName,
                })).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                    Data: {
                        SecurityProfileId: createCommandResponse.SecurityProfileId,
                        SecurityProfileArn: createCommandResponse.SecurityProfileArn,
                    },
                };

            }

            case "Update": {

                // TODO
                throw Error('Update action has not been implemented on ConnectSecurityProfile. Please change name to delete this one and create a new one.');

            }

            case "Delete": {

                const listCommand = new ListSecurityProfilesCommand({ // TODO Multiple pages
                    InstanceId: props.InstanceId,
                });
                const listCommandResponse = await connect.send(listCommand);

                const securityProfile = listCommandResponse.SecurityProfileSummaryList!.find(
                    (name) => name === props.SecurityProfileName,
                );

                if (!securityProfile) {
                    return {
                        ...event,
                        Status: "SUCCESS",
                    };
                }

                const command = new DeleteSecurityProfileCommand({
                    InstanceId: props.InstanceId,
                    SecurityProfileId: securityProfile.Id,
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
