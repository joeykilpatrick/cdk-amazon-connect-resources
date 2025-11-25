import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import * as crypto from "crypto";
import {
    AssociateInstanceStorageConfigCommand,
    AssociateInstanceStorageConfigRequest,
    ConnectClient,
    DisassociateInstanceStorageConfigCommand,
    InstanceStorageConfig,
    paginateListInstanceStorageConfigs,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export type InstanceStorageConfigProps = AssociateInstanceStorageConfigRequest;

export class ConnectInstanceStorageConfig extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: InstanceStorageConfigProps) {
        super(scope, id, props, ResourceType.INSTANCE_STORAGE_CONFIG);
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as InstanceStorageConfigProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create": {

                const configs: InstanceStorageConfig[] = [];
                for await (const page of paginateListInstanceStorageConfigs({client: connect}, {
                    InstanceId: props.InstanceId,
                    ResourceType: props.ResourceType,
                })) {
                    configs.push(...page.StorageConfigs!);
                }

                const existsAlready = configs.some(
                    (config) => config.StorageType === props.ResourceType
                );

                if (existsAlready) {
                    throw Error(`Instance ${props.InstanceId} already has a storage config of type ${props.ResourceType} associated.`);
                }

                const associateCommand = new AssociateInstanceStorageConfigCommand(props);
                await connect.send(associateCommand);

                const propsHash = crypto.createHash('md5').update(JSON.stringify(props)).digest('hex').slice(0, 12);

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: propsHash,
                };
            }

            case "Update": {
                throw Error("Updates are not supported for this resource type yet. Please delete and re-create.");
            }

            case "Delete": {

                const configs: InstanceStorageConfig[] = [];
                for await (const page of paginateListInstanceStorageConfigs({client: connect}, {
                    InstanceId: props.InstanceId,
                    ResourceType: props.ResourceType,
                })) {
                    configs.push(...page.StorageConfigs!);
                }

                const exists = configs.find(
                    (config) => config.StorageType === props.ResourceType
                );

                if (!exists) {
                    return {
                        ...event,
                        Status: "SUCCESS",
                    };
                };

                const command = new DisassociateInstanceStorageConfigCommand({
                    InstanceId: props.InstanceId,
                    AssociationId: exists.AssociationId,
                    ResourceType: props.ResourceType,
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
