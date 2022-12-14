import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as CDK from "aws-cdk-lib";
import {
    ConnectClient,
    CreateRoutingProfileCommand,
    CreateRoutingProfileRequest,
    paginateListRoutingProfiles,
    RoutingProfileSummary,
    UpdateRoutingProfileConcurrencyCommand,
    UpdateRoutingProfileDefaultOutboundQueueCommand,
    UpdateRoutingProfileNameCommand,
    UpdateRoutingProfileQueuesCommand,
} from "@aws-sdk/client-connect";
import isEqual from "lodash/isEqual";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

interface ConnectRoutingProfileProps extends CreateRoutingProfileRequest {
    InstanceId: string,
    Name: string,
    RemovalPolicy: CDK.RemovalPolicy.RETAIN, // Routing Profiles cannot be deleted.
}

export class ConnectRoutingProfile extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ConnectRoutingProfileProps) {
        super(scope, id, props, ResourceType.ROUTING_PROFILE);
        this.applyRemovalPolicy(props.RemovalPolicy);
    }

    get attrId(): string {
        return this.getAttString('RoutingProfileId');
    }

    get attrArn(): string {
        return this.getAttString('RoutingProfileArn');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as ConnectRoutingProfileProps;

        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const existingProfile = await ConnectRoutingProfile.getRoutingProfile(props.InstanceId, props.Name);

                if (existingProfile) {
                    throw Error(`Routing Profile "${props.Name}" already exists on Connect instance ${props.InstanceId}.`);
                }

                const createCommand = new CreateRoutingProfileCommand(props);
                const createCommandResponse = await connect.send(createCommand);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: Date.now().toString(),
                    Data: {
                        RoutingProfileId: createCommandResponse.RoutingProfileId,
                        RoutingProfileArn: createCommandResponse.RoutingProfileArn,
                    },
                };

            }

            case "Update": {

                const newProps = props;
                const oldProps = JSON.parse(event.OldResourceProperties.PropString) as ConnectRoutingProfileProps;

                if (newProps.InstanceId !== oldProps.InstanceId) {
                    return await ConnectRoutingProfile.handleCloudFormationEvent({...event, RequestType: 'Create'});
                }

                const currentProfile = await ConnectRoutingProfile.getRoutingProfile(oldProps.InstanceId, oldProps.Name);

                if (!currentProfile) {
                    throw Error(`Did not find Routing Profile "${oldProps.Name}" on Connect instance ${oldProps.InstanceId} to update.`);
                }

                if (newProps.DefaultOutboundQueueId !== oldProps.DefaultOutboundQueueId) {
                    const updateCommand = new UpdateRoutingProfileDefaultOutboundQueueCommand({
                        InstanceId: newProps.InstanceId,
                        RoutingProfileId: currentProfile.Id,
                        DefaultOutboundQueueId: newProps.DefaultOutboundQueueId,
                    });
                    await connect.send(updateCommand);
                }

                if (!isEqual(newProps.MediaConcurrencies, oldProps.MediaConcurrencies)) {
                    const updateCommand = new UpdateRoutingProfileConcurrencyCommand({
                        InstanceId: newProps.InstanceId,
                        RoutingProfileId: currentProfile.Id,
                        MediaConcurrencies: newProps.MediaConcurrencies,
                    });
                    await connect.send(updateCommand);
                }

                if (newProps.Name !== oldProps.Name) {
                    const updateCommand = new UpdateRoutingProfileNameCommand({
                        InstanceId: newProps.InstanceId,
                        RoutingProfileId: currentProfile.Id,
                        Name: newProps.Name,
                    });
                    await connect.send(updateCommand);
                }

                if (!isEqual(newProps.QueueConfigs, oldProps.QueueConfigs)) {
                    const updateCommand = new UpdateRoutingProfileQueuesCommand({
                        InstanceId: newProps.InstanceId,
                        RoutingProfileId: currentProfile.Id,
                        QueueConfigs: newProps.QueueConfigs,
                    });
                    await connect.send(updateCommand);
                }

                return {
                    ...event,
                    Status: "SUCCESS",
                    Data: {
                        RoutingProfileId: currentProfile.Id,
                        RoutingProfileArn: currentProfile.Arn,
                    },
                };

            }

            case "Delete": {

                throw Error('There is no AWS API to delete a Connect Routing Profile. Resource must be retained and deletion skipped.');

            }

        }
    }

    static async getRoutingProfile(instanceId: string, profileName: string): Promise<RoutingProfileSummary | undefined> {

        const routingProfiles: RoutingProfileSummary[] = [];
        for await (const page of paginateListRoutingProfiles({client: connect}, {InstanceId: instanceId})) {
            routingProfiles.push(...page.RoutingProfileSummaryList!);
        }

        return routingProfiles.find(
            (summary) => summary.Name === profileName,
        );

    }

}
