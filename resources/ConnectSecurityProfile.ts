import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    ConnectClient,
    CreateSecurityProfileCommand,
    CreateSecurityProfileRequest,
    DeleteSecurityProfileCommand,
    ListSecurityProfilesCommand,
    SecurityProfileSummary,
    UpdateSecurityProfileCommand,
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

                const existingProfile = await ConnectSecurityProfile.getSecurityProfile(props.InstanceId, props.SecurityProfileName);

                if (existingProfile) {
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

                const newProps = props;
                const oldProps = JSON.parse(event.OldResourceProperties.PropString) as ConnectSecurityProfileProps;

                if (
                    newProps.SecurityProfileName !== oldProps.SecurityProfileName
                    || newProps.InstanceId !== oldProps.InstanceId
                ) {
                    return await ConnectSecurityProfile.handleCloudFormationEvent({...event, RequestType: 'Create'});
                }

                const currentProfile = await ConnectSecurityProfile.getSecurityProfile(newProps.InstanceId, newProps.SecurityProfileName);

                if (!currentProfile) {
                    throw Error(`Did not find Security Profile "${props.SecurityProfileName}" on Connect instance ${props.InstanceId} to update.`);
                }

                const updateCommand = new UpdateSecurityProfileCommand({
                    InstanceId: props.InstanceId,
                    SecurityProfileId: currentProfile.Id,

                    AllowedAccessControlTags: props.AllowedAccessControlTags,
                    Description: props.Description,
                    Permissions: props.Permissions,
                    TagRestrictedResources: props.TagRestrictedResources,
                });
                await connect.send(updateCommand);

                return {
                    ...event,
                    Status: "SUCCESS",
                };

            }

            case "Delete": {

                const securityProfile = await ConnectSecurityProfile.getSecurityProfile(props.InstanceId, props.SecurityProfileName);

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

    static async getSecurityProfile(instanceId: string, profileName: string): Promise<SecurityProfileSummary | undefined> {

        const listCommand = new ListSecurityProfilesCommand({ // TODO Multiple pages
            InstanceId: instanceId,
        });
        const listCommandResponse = await connect.send(listCommand);

        return listCommandResponse.SecurityProfileSummaryList!.find(
            (summary) => summary.Name === profileName,
        );

    }

}
