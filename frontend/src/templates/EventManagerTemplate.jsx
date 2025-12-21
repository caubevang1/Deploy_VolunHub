import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SnippetsOutlined,
    FileAddOutlined,
    AppstoreOutlined
} from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { GetUserInfo } from '../services/UserService';
import dhcn from '../assets/img/Logo_UET.webp';
import eventmanager from '../assets/img/Eventmanager.png';
import { removeLocalStorage } from '../utils/Configs';
import { LOCALSTORAGE_USER } from '../utils/Constants';

const { Header, Sider, Content } = Layout;

export default function EventManagerTemplate() {
    const [collapsed, setCollapsed] = useState(false);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchUserInfo = async () => {
            try {
                const res = await GetUserInfo();
                const userData = res.data?.body || res.data?.content || res.data;

                if (!mounted) return;

                if (userData.role !== 'EVENTMANAGER') {
                    removeLocalStorage(LOCALSTORAGE_USER);
                    window.location.href = '/';
                } else {
                    setUserInfo(userData);
                }
            } catch (error) {
                console.error('EventManager auth error:', error);
                if (mounted) {
                    removeLocalStorage(LOCALSTORAGE_USER);
                    window.location.href = '/';
                }
            }
        };

        fetchUserInfo();
        return () => { mounted = false; };
    }, []);

    const menuItems = [
        {
            type: 'group',
            label: <span className="text-white font-semibold">TRANG CHỦ</span>,
            children: [
                {
                    key: 'dashboard',
                    icon: <AppstoreOutlined />,
                    label: <NavLink to='dashboard'>Dashboard</NavLink>,
                },
            ],
        },
        {
            type: 'group',
            label: <span className="text-white font-semibold">HOẠT ĐỘNG</span>,
            children: [
                {
                    key: 'event-manager',
                    icon: <SnippetsOutlined />,
                    label: 'Quản lý sự kiện',
                    children: [
                        {
                            key: 'my-events',
                            icon: <FileAddOutlined />,
                            label: <NavLink to='su-kien'>Sự kiện của tôi</NavLink>,
                        },
                        {
                            key: 'create-event',
                            icon: <FileAddOutlined />,
                            label: <NavLink to='su-kien/tao'>Tạo sự kiện</NavLink>,
                        }
                    ]
                },
            ],
        },
    ];

    return (
        <Layout className="!min-h-screen">
            <Sider trigger={null} collapsible collapsed={collapsed} width={250}>
                <div className="flex flex-col h-full justify-between pb-4">

                    {/* --- PHẦN TRÊN: LOGO + MENU --- */}
                    <div>
                        <NavLink to='/' className="flex items-center justify-center p-2">
                            <img
                                src={dhcn}
                                alt="Logo UET"
                                className=" w-[85px] h-auto rounded-full object-cover transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_8px_rgba(24,144,255,0.6)] mt-3 mb-4"
                            />
                        </NavLink>

                        {/* Menu Items */}
                        <Menu
                            theme="dark"
                            mode="inline"
                            defaultSelectedKeys={['dashboard']}
                            items={menuItems}
                            className="mt-4"
                        />
                    </div>

                    {/* --- PHẦN DƯỚI: ẢNH EVENT MANAGER --- */}
                    <div className="flex flex-col items-center justify-center gap-2 transition-all duration-300">
                        <img
                            src={eventmanager}
                            alt="Event Manager"
                            className={`transition-all duration-300 ${collapsed ? 'w-10 h-auto' : 'w-full h-auto'}`}
                        />
                    </div>
                </div>
            </Sider>

            <Layout className="site-layout ">
                <Header className="site-layout-background !pl-4 text-[1.8rem] !bg-white shadow-sm flex items-center">
                    {React.createElement(
                        collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
                        {
                            className: 'trigger hover:text-blue-500 transition-colors cursor-pointer',
                            onClick: () => setCollapsed(!collapsed),
                        }
                    )}
                </Header>

                <Content
                    className="site-layout-background contentAdmin !bg-white"
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 500,
                        borderRadius: '8px'
                    }}
                >
                    <Outlet context={userInfo} />
                </Content>
            </Layout>
        </Layout>
    );
}