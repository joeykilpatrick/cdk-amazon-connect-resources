import * as Connect from 'aws-cdk-lib/aws-connect';
import {Construct} from 'constructs';

import {ConnectPhoneNumberContactFlowAssociation} from ".";

export class ConnectFlowPhoneNumber extends Connect.CfnPhoneNumber {

    public readonly phoneNumberAssociation: ConnectPhoneNumberContactFlowAssociation;

    constructor(
        scope: Construct,
        id: string,
        props: Omit<Connect.CfnPhoneNumberProps, 'targetArn'> & {
            connectInstance: Connect.CfnInstance,
            contactFlow: Connect.CfnContactFlow,
        },
    ) {
        super(scope, id, {
            ...props,
            targetArn: props.connectInstance.attrArn,
        });

        this.phoneNumberAssociation = new ConnectPhoneNumberContactFlowAssociation(this, 'phoneNumberAssociation', {
            connectInstanceId: props.connectInstance.attrId,
            phoneNumberId: this.ref,
            contactFlowId: props.contactFlow.ref,
        });

    }

}
