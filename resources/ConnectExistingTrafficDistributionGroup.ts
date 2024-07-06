import type {CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse} from "aws-lambda";
import {
    ConnectClient,
    TrafficDistributionGroupSummary,
    paginateListTrafficDistributionGroups,
} from "@aws-sdk/client-connect";
import {Construct} from 'constructs';

import {ConnectCustomResource, ResourceType} from "./provider";

const connect = new ConnectClient({});

export interface ExistingTrafficDistributionGroupProps {
    readonly trafficDistributionGroupName: string;
}

export class ConnectExistingTrafficDistributionGroup extends ConnectCustomResource {

    public constructor(scope: Construct, id: string, props: ExistingTrafficDistributionGroupProps) {
        super(scope, id, props, ResourceType.EXISTING_INSTANCE);
    }

    get attrArn(): string {
        return this.getAttString('Arn');
    }

    get attrId(): string {
        return this.getAttString('Id');
    }

    get attrInstanceArn(): string {
        return this.getAttString('InstanceArn');
    }

    get attrIsDefault(): string {
        return this.getAttString('IsDefault');
    }

    static async handleCloudFormationEvent(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {
        const props = JSON.parse(event.ResourceProperties.PropString) as ExistingTrafficDistributionGroupProps;
        console.log({props});

        switch (event.RequestType) {

            case "Create":
            case "Update": {

                const groups: TrafficDistributionGroupSummary[] = [];
                for await (const page of paginateListTrafficDistributionGroups({client: connect}, {})) {
                    groups.push(...page.TrafficDistributionGroupSummaryList!);
                }

                const group = groups.find(
                    (group) => group.Name === props.trafficDistributionGroupName
                );

                if (!group) {
                    throw Error(`Could not find traffic distribution group with name "${props.trafficDistributionGroupName}" in this account.`);
                }

                return {
                    ...event,
                    Status: "SUCCESS",
                    PhysicalResourceId: Date.now().toString(),
                    Data: group,
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
