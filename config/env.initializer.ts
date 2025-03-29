export interface AccountProperties {
    account: string;
    region: string;
}

interface Accounts {
    [key: string]: AccountProperties;
}
export interface EnvironmentProperties {
    env: AccountProperties;
    branch: string;
    requireApproval: boolean;
    vpcId: string;
    alias_name?: string; // Optional property
    bucketName: string;
}



interface Environments {
    [key:string] : EnvironmentProperties,
}

 //CHANGE
const accounts:Accounts = {
    production: {
        account: "your-account-id",
        region: "your-region",
    },
};



export const environments: Environments = {
    "production": {
        env: accounts.production,
        branch: "master",
        requireApproval: true,
        vpcId: "your-vpc-id",
        alias_name : "production-yoti-integration",
        bucketName: "production-yoti-private-keys"
    },
    
};